import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireManager } from './auth';
import {
  findOwnedClient,
  logActivity,
  newReviewToken,
  serializeClient,
} from './shared';
import { validateClientInput } from '../src/lib/validation';

const clientInput = v.object({
  client_name: v.string(),
  business_name: v.string(),
  email: v.string(),
  profile_image_url: v.union(v.string(), v.null()),
});

export const list = query({
  args: { token: v.string(), includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const clients = await ctx.db
      .query('clients')
      .withIndex('by_manager', (q) => q.eq('manager_id', manager._id))
      .collect();

    return clients
      .filter((c) => (args.includeArchived ? true : c.archived_at === null))
      .sort((a, b) => a.business_name.localeCompare(b.business_name))
      .map(serializeClient);
  },
});

export const get = query({
  args: { token: v.string(), clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const client = await findOwnedClient(ctx, manager._id, args.clientId);
    if (!client) return null;
    return serializeClient(client);
  },
});

export const create = mutation({
  args: { token: v.string(), input: clientInput },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const validated = validateClientInput(args.input);
    if (!validated.ok) throw new ConvexError(validated.error);

    const duplicate = await ctx.db
      .query('clients')
      .withIndex('by_manager_email', (q) => q.eq('manager_id', manager._id).eq('email', validated.data.email))
      .collect();
    const clash = duplicate.some(
      (c) => c.archived_at === null && c.business_name.toLowerCase() === validated.data.business_name.toLowerCase(),
    );
    if (clash) throw new ConvexError('You already have an active client with this email and business name.');

    const clientId = await ctx.db.insert('clients', {
      manager_id: manager._id,
      ...validated.data,
      review_token: newReviewToken(),
      review_token_expires_at: null,
      archived_at: null,
      created_at: new Date().toISOString(),
    });

    await logActivity(ctx, manager._id, {
      client_id: clientId,
      activity_type: 'client_created',
      description: `Added new client ${validated.data.business_name}`,
    });

    const created = await ctx.db.get(clientId);
    return serializeClient(created!);
  },
});

export const update = mutation({
  args: { token: v.string(), clientId: v.id('clients'), input: clientInput },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const existing = await findOwnedClient(ctx, manager._id, args.clientId);
    if (!existing) throw new ConvexError('Client not found.');

    const validated = validateClientInput(args.input);
    if (!validated.ok) throw new ConvexError(validated.error);

    await ctx.db.patch(args.clientId, validated.data);
    await logActivity(ctx, manager._id, {
      client_id: args.clientId,
      activity_type: 'client_updated',
      description: `Updated client details for ${validated.data.business_name}`,
    });

    const updated = await ctx.db.get(args.clientId);
    return serializeClient(updated!);
  },
});

/**
 * Soft-deletes a client: their posts move to the archive and the review token is rotated,
 * so any link already shared with that client stops resolving immediately.
 */
export const archive = mutation({
  args: { token: v.string(), clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const existing = await findOwnedClient(ctx, manager._id, args.clientId);
    if (!existing) throw new ConvexError('Client not found.');

    const stamp = new Date().toISOString();
    await ctx.db.patch(args.clientId, { archived_at: stamp, review_token: newReviewToken() });

    const posts = await ctx.db
      .query('posts')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();
    for (const post of posts) {
      if (post.manager_id === manager._id && post.status !== 'archived') {
        await ctx.db.patch(post._id, { status: 'archived', updated_at: stamp });
      }
    }

    await logActivity(ctx, manager._id, {
      client_id: args.clientId,
      activity_type: 'client_updated',
      description: `Archived client ${existing.business_name}`,
    });
    return { ok: true };
  },
});

export const restore = mutation({
  args: { token: v.string(), clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const existing = await findOwnedClient(ctx, manager._id, args.clientId);
    if (!existing) throw new ConvexError('Client not found.');

    await ctx.db.patch(args.clientId, { archived_at: null });
    await logActivity(ctx, manager._id, {
      client_id: args.clientId,
      activity_type: 'client_updated',
      description: `Restored client ${existing.business_name}`,
    });
    return { ok: true };
  },
});

/** Issues a fresh review link, invalidating the old one. */
export const rotateToken = mutation({
  args: { token: v.string(), clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const manager = await requireManager(ctx, args.token);
    const existing = await findOwnedClient(ctx, manager._id, args.clientId);
    if (!existing) throw new ConvexError('Client not found.');

    const review_token = newReviewToken();
    await ctx.db.patch(args.clientId, { review_token });
    await logActivity(ctx, manager._id, {
      client_id: args.clientId,
      activity_type: 'client_updated',
      description: `Issued a new review link for ${existing.business_name}`,
    });

    const updated = await ctx.db.get(args.clientId);
    return serializeClient(updated!);
  },
});
