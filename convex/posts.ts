import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireManager } from './auth';
import { findOwnedClient, findOwnedPost, logActivity, serializePost } from './shared';
import type { Id } from './_generated/dataModel';
import { validatePostInput } from '../src/lib/validation';
import { platform, postStatus } from './schema';

const postInput = v.object({
  title: v.string(),
  client_id: v.id('clients'),
  platform,
  caption: v.string(),
  image_url: v.union(v.string(), v.null()),
  scheduled_date: v.string(),
  review_deadline: v.union(v.string(), v.null()),
  notes: v.union(v.string(), v.null()),
});

export const list = query({
  args: {
    token: v.string(),
    clientId: v.optional(v.id('clients')),
    status: v.optional(v.union(postStatus, v.literal('all'))),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const posts = await ctx.db
      .query('posts')
      .withIndex('by_manager_updated', (q) => q.eq('manager_id', manager._id))
      .order('desc')
      .collect();

    return posts
      .filter((p) => (args.includeArchived ? true : p.status !== 'archived'))
      .filter((p) => (args.clientId ? p.client_id === args.clientId : true))
      .filter((p) => (args.status && args.status !== 'all' ? p.status === args.status : true))
      .map(serializePost);
  },
});

export const get = query({
  args: { token: v.string(), postId: v.id('posts') },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const post = await findOwnedPost(ctx, manager._id, args.postId);
    return post ? serializePost(post) : null;
  },
});

export const create = mutation({
  args: { token: v.string(), input: postInput, submit: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const validated = validatePostInput(args.input);
    if (!validated.ok) throw new ConvexError(validated.error);

    const client = await findOwnedClient(ctx, manager._id, args.input.client_id);
    if (!client) throw new ConvexError('Choose one of your clients for this post.');
    if (client.archived_at) throw new ConvexError('This client is archived. Restore the client before assigning new posts.');

    const stamp = new Date().toISOString();
    const submit = args.submit === true;
    const postId = await ctx.db.insert('posts', {
      manager_id: manager._id,
      ...validated.data,
      client_id: args.input.client_id,
      status: submit ? 'pending_approval' : 'draft',
      revision: 1,
      submitted_at: submit ? stamp : null,
      created_at: stamp,
      updated_at: stamp,
    });

    await logActivity(ctx, manager._id, {
      post_id: postId,
      client_id: client._id,
      activity_type: 'post_created',
      description: `Created ${submit ? 'post' : 'draft'} "${validated.data.title}"`,
    });
    if (submit) {
      await logActivity(ctx, manager._id, {
        post_id: postId,
        client_id: client._id,
        activity_type: 'post_submitted',
        description: `Submitted "${validated.data.title}" to ${client.business_name}`,
      });
    }

    const created = await ctx.db.get(postId);
    return serializePost(created!);
  },
});

export const update = mutation({
  args: { token: v.string(), postId: v.id('posts'), input: postInput },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const existing = await findOwnedPost(ctx, manager._id, args.postId);
    if (!existing) throw new ConvexError('Post not found.');
    if (existing.status === 'archived') throw new ConvexError('Restore this post before editing it.');

    const validated = validatePostInput(args.input);
    if (!validated.ok) throw new ConvexError(validated.error);

    const client = await findOwnedClient(ctx, manager._id, args.input.client_id);
    if (!client) throw new ConvexError('Choose one of your clients for this post.');
    if (client.archived_at) throw new ConvexError('This client is archived. Restore the client before assigning posts.');

    await ctx.db.patch(args.postId, {
      ...validated.data,
      client_id: args.input.client_id as Id<'clients'>,
      updated_at: new Date().toISOString(),
    });
    await logActivity(ctx, manager._id, {
      post_id: args.postId,
      client_id: client._id,
      activity_type: 'post_updated',
      description: `Updated "${validated.data.title}"`,
    });

    const updated = await ctx.db.get(args.postId);
    return serializePost(updated!);
  },
});

/**
 * Draft or changes-requested -> pending approval.
 * Resubmitting after feedback bumps `revision` so earlier decisions stay in history and any
 * tab still showing the old content is rejected by `review.decide`.
 */
export const submit = mutation({
  args: { token: v.string(), postId: v.id('posts') },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const post = await findOwnedPost(ctx, manager._id, args.postId);
    if (!post) throw new ConvexError('Post not found.');

    if (post.status === 'pending_approval') throw new ConvexError('This post is already waiting for the client.');
    if (post.status === 'approved') throw new ConvexError('Approved posts cannot be resubmitted. Create a new revision instead.');
    if (post.status === 'archived') throw new ConvexError('Restore this post before submitting it.');

    const client = await findOwnedClient(ctx, manager._id, post.client_id);
    if (!client) throw new ConvexError('This post is not linked to one of your clients.');
    if (client.archived_at) throw new ConvexError('This client is archived, so the review link is disabled.');

    const isRevision = post.status === 'changes_requested';
    const stamp = new Date().toISOString();
    await ctx.db.patch(args.postId, {
      status: 'pending_approval',
      revision: isRevision ? post.revision + 1 : post.revision,
      submitted_at: stamp,
      updated_at: stamp,
    });

    await logActivity(ctx, manager._id, {
      post_id: args.postId,
      client_id: client._id,
      activity_type: 'post_submitted',
      description: isRevision
        ? `Resubmitted revision ${post.revision + 1} of "${post.title}" to ${client.business_name}`
        : `Submitted "${post.title}" to ${client.business_name}`,
    });

    const updated = await ctx.db.get(args.postId);
    return serializePost(updated!);
  },
});

export const duplicate = mutation({
  args: { token: v.string(), postId: v.id('posts') },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const existing = await findOwnedPost(ctx, manager._id, args.postId);
    if (!existing) throw new ConvexError('Post not found.');

    const stamp = new Date().toISOString();
    const copyId = await ctx.db.insert('posts', {
      manager_id: manager._id,
      client_id: existing.client_id,
      title: `${existing.title} (copy)`.slice(0, 120),
      platform: existing.platform,
      caption: existing.caption,
      image_url: existing.image_url,
      scheduled_date: existing.scheduled_date,
      review_deadline: existing.review_deadline,
      notes: existing.notes,
      status: 'draft',
      revision: 1,
      submitted_at: null,
      created_at: stamp,
      updated_at: stamp,
    });

    await logActivity(ctx, manager._id, {
      post_id: copyId,
      client_id: existing.client_id,
      activity_type: 'post_duplicated',
      description: `Duplicated "${existing.title}" as a new draft`,
    });

    const copy = await ctx.db.get(copyId);
    return serializePost(copy!);
  },
});

export const archive = mutation({
  args: { token: v.string(), postId: v.id('posts') },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const existing = await findOwnedPost(ctx, manager._id, args.postId);
    if (!existing) throw new ConvexError('Post not found.');

    await ctx.db.patch(args.postId, { status: 'archived', updated_at: new Date().toISOString() });
    await logActivity(ctx, manager._id, {
      post_id: args.postId,
      client_id: existing.client_id,
      activity_type: 'post_archived',
      description: `Archived "${existing.title}"`,
    });
    return { ok: true };
  },
});

export const restore = mutation({
  args: { token: v.string(), postId: v.id('posts') },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const existing = await findOwnedPost(ctx, manager._id, args.postId);
    if (!existing) throw new ConvexError('Post not found.');
    if (existing.status !== 'archived') throw new ConvexError('Only archived posts can be restored.');

    await ctx.db.patch(args.postId, { status: 'draft', updated_at: new Date().toISOString() });
    await logActivity(ctx, manager._id, {
      post_id: args.postId,
      client_id: existing.client_id,
      activity_type: 'post_restored',
      description: `Restored "${existing.title}" as a draft`,
    });
    return { ok: true };
  },
});
