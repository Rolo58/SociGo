import { v } from 'convex/values';
import { query } from './_generated/server';
import { requireManager } from './auth';
import { serializeActivity, serializeFeedback, serializePost } from './shared';

/** Dashboard figures are computed from live rows, never from a cached counter. */
export const stats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const posts = await ctx.db
      .query('posts')
      .withIndex('by_manager', (q) => q.eq('manager_id', manager._id))
      .collect();
    const clients = await ctx.db
      .query('clients')
      .withIndex('by_manager', (q) => q.eq('manager_id', manager._id))
      .collect();

    const count = (status: string) => posts.filter((p) => p.status === status).length;
    return {
      totalPosts: posts.filter((p) => p.status !== 'archived').length,
      pendingApprovals: count('pending_approval'),
      approvedPosts: count('approved'),
      changesRequested: count('changes_requested'),
      drafts: count('draft'),
      archived: count('archived'),
      activeClients: clients.filter((c) => c.archived_at === null).length,
    };
  },
});

export const activity = query({
  args: { token: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const logs = await ctx.db
      .query('activity_logs')
      .withIndex('by_manager_created', (q) => q.eq('manager_id', manager._id))
      .order('desc')
      .take(args.limit ?? 12);
    return logs.map(serializeActivity);
  },
});

export const pendingQueue = query({
  args: { token: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const posts = await ctx.db
      .query('posts')
      .withIndex('by_manager_updated', (q) => q.eq('manager_id', manager._id))
      .order('desc')
      .collect();
    return posts
      .filter((p) => p.status === 'pending_approval')
      .slice(0, args.limit ?? 6)
      .map(serializePost);
  },
});

/** Feedback history for one post, used by the manager's post detail view. */
export const postFeedback = query({
  args: { token: v.string(), postId: v.id('posts') },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const post = await ctx.db.get(args.postId);
    if (!post || post.manager_id !== manager._id) return [];
    const entries = await ctx.db
      .query('feedback')
      .withIndex('by_post', (q) => q.eq('post_id', args.postId))
      .collect();
    return entries.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(serializeFeedback);
  },
});

/** Posts scheduled inside a date range, for the calendar views. */
export const scheduled = query({
  args: { token: v.string(), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const posts = await ctx.db
      .query('posts')
      .withIndex('by_manager_scheduled', (q) =>
        q.eq('manager_id', manager._id).gte('scheduled_date', args.startDate).lte('scheduled_date', args.endDate),
      )
      .collect();
    return posts.filter((p) => p.status !== 'archived').map(serializePost);
  },
});

/** All feedback rows for the signed-in manager, used for derived views and counts. */
export const feedback = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const posts = await ctx.db
      .query('posts')
      .withIndex('by_manager', (q) => q.eq('manager_id', manager._id))
      .collect();
    const entries = [];
    for (const post of posts) {
      const rows = await ctx.db
        .query('feedback')
        .withIndex('by_post', (q) => q.eq('post_id', post._id))
        .collect();
      entries.push(...rows);
    }
    return entries.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(serializeFeedback);
  },
});
