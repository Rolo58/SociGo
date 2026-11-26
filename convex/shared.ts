import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { requireManager } from './auth';
import { activityType, platform, postStatus } from './schema';
import { validateClientInput, validatePostInput } from '../src/lib/validation';

/**
 * Shared helpers for the workspace modules.
 *
 * Every manager-scoped lookup treats another tenant's row as missing rather than forbidden,
 * so the API cannot be used to probe for the existence of other managers' data.
 */

export type PostStatusLiteral = 'draft' | 'pending_approval' | 'approved' | 'changes_requested' | 'archived';

export function newReviewToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `rvt_${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;
}

export async function logActivity(
  ctx: MutationCtx,
  managerId: Id<'profiles'>,
  entry: {
    post_id?: Id<'posts'> | null;
    client_id?: Id<'clients'> | null;
    activity_type: Doc<'activity_logs'>['activity_type'];
    description: string;
  },
) {
  await ctx.db.insert('activity_logs', {
    manager_id: managerId,
    post_id: entry.post_id ?? null,
    client_id: entry.client_id ?? null,
    activity_type: entry.activity_type,
    description: entry.description,
    created_at: new Date().toISOString(),
  });
}

export async function findOwnedClient(
  ctx: QueryCtx | MutationCtx,
  managerId: Id<'profiles'>,
  clientId: Id<'clients'>,
) {
  const client = await ctx.db.get(clientId);
  if (!client || client.manager_id !== managerId) return null;
  return client;
}

export async function findOwnedPost(
  ctx: QueryCtx | MutationCtx,
  managerId: Id<'profiles'>,
  postId: Id<'posts'>,
) {
  const post = await ctx.db.get(postId);
  if (!post || post.manager_id !== managerId) return null;
  return post;
}

export function serializePost(post: Doc<'posts'>) {
  return { ...post, id: post._id };
}

export function serializeClient(client: Doc<'clients'>) {
  return { ...client, id: client._id };
}

export function serializeFeedback(entry: Doc<'feedback'>) {
  return { ...entry, id: entry._id };
}

export function serializeActivity(entry: Doc<'activity_logs'>) {
  return { ...entry, id: entry._id };
}

export { requireManager, validateClientInput, validatePostInput, activityType, platform, postStatus };
