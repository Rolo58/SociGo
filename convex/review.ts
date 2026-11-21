import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { logActivity, serializeClient, serializeFeedback, serializePost } from './shared';
import { validateFeedback } from '../src/lib/validation';
import { decision as decisionValidator } from './schema';

/**
 * Client review portal.
 *
 * The review token in the URL is the *only* credential. No function here accepts a client id
 * from the caller: the client is always re-derived from the token, so a client cannot act on
 * another client's post by editing the request. Drafts and archived posts never appear.
 */

async function resolveSession(ctx: QueryCtx | MutationCtx, token: string) {
  const trimmed = token?.trim();
  if (!trimmed) return { error: 'This review link is not valid.' } as const;

  const client = await ctx.db
    .query('clients')
    .withIndex('by_review_token', (q) => q.eq('review_token', trimmed))
    .unique();

  if (!client) return { error: 'This review link is not valid or has been replaced.' } as const;
  if (client.archived_at) return { error: 'This review link has been closed by the manager.' } as const;

  if (client.review_token_expires_at && Date.parse(client.review_token_expires_at) < Date.now()) {
    return { error: 'This review link has expired. Ask your manager to send a new one.' } as const;
  }

  return { client } as const;
}

function visiblePosts(posts: Doc<'posts'>[]) {
  return posts.filter((p) => p.status !== 'draft' && p.status !== 'archived');
}

export const session = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const resolved = await resolveSession(ctx, args.token);
    if ('error' in resolved && resolved.error) return { ok: false as const, error: resolved.error };

    const { client } = resolved;
    const manager = await ctx.db.get(client.manager_id);
    const posts = await ctx.db
      .query('posts')
      .withIndex('by_client', (q) => q.eq('client_id', client._id))
      .collect();

    return {
      ok: true as const,
      client: serializeClient(client),
      manager: manager
        ? { full_name: manager.full_name, business_name: manager.business_name }
        : null,
      posts: visiblePosts(posts)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map(serializePost),
    };
  },
});

export const post = query({
  args: { token: v.string(), postId: v.id('posts') },
  handler: async (ctx, args) => {
    const resolved = await resolveSession(ctx, args.token);
    if ('error' in resolved && resolved.error) return { ok: false as const, error: resolved.error };

    const post = await ctx.db.get(args.postId);
    // A post belonging to another client is reported as unavailable, not forbidden.
    if (!post || post.client_id !== resolved.client._id) {
      return { ok: false as const, error: 'That post is not available on this review link.' };
    }
    if (post.status === 'draft' || post.status === 'archived') {
      return { ok: false as const, error: 'That post is not available on this review link.' };
    }

    const history = await ctx.db
      .query('feedback')
      .withIndex('by_post', (q) => q.eq('post_id', post._id))
      .collect();

    return {
      ok: true as const,
      post: serializePost(post),
      feedback: history.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(serializeFeedback),
    };
  },
});

export const decide = mutation({
  args: {
    token: v.string(),
    postId: v.id('posts'),
    decision: decisionValidator,
    comments: v.string(),
    expectedRevision: v.number(),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveSession(ctx, args.token);
    if ('error' in resolved && resolved.error) throw new ConvexError(resolved.error);

    const { client } = resolved;
    const post = await ctx.db.get(args.postId);
    if (!post || post.client_id !== client._id) {
      throw new ConvexError('That post is not available on this review link.');
    }

    if (post.status !== 'pending_approval') {
      throw new ConvexError(
        post.status === 'approved'
          ? 'This post has already been approved.'
          : 'This post is no longer waiting for your review.',
      );
    }

    if (args.expectedRevision !== post.revision) {
      throw new ConvexError('This content was updated after you opened it. Reload the page to review the latest version.');
    }

    // Convex mutations are serializable, so this check cannot race a second decision.
    const existing = await ctx.db
      .query('feedback')
      .withIndex('by_post_revision', (q) => q.eq('post_id', post._id).eq('post_revision', post.revision))
      .first();
    if (existing) throw new ConvexError('A decision has already been recorded for this version of the post.');

    const validated = validateFeedback(args.decision, args.comments);
    if (!validated.ok) throw new ConvexError(validated.error);

    const stamp = new Date().toISOString();
    const feedbackId = await ctx.db.insert('feedback', {
      post_id: post._id,
      client_id: client._id,
      manager_id: post.manager_id,
      decision: args.decision,
      comments: validated.data,
      post_revision: post.revision,
      created_at: stamp,
    });

    await ctx.db.patch(post._id, {
      status: args.decision === 'approved' ? 'approved' : 'changes_requested',
      updated_at: stamp,
    });

    await logActivity(ctx, post.manager_id, {
      post_id: post._id,
      client_id: client._id,
      activity_type: args.decision === 'approved' ? 'post_approved' : 'changes_requested',
      description:
        args.decision === 'approved'
          ? `${client.client_name} approved "${post.title}"`
          : `${client.client_name} requested changes on "${post.title}"`,
    });

    const feedback = await ctx.db.get(feedbackId);
    const updated = await ctx.db.get(post._id);
    return { post: serializePost(updated!), feedback: serializeFeedback(feedback!) };
  },
});
