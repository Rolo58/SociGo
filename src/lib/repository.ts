import type { ActivityLog, Client, Database, Feedback, Post, PostStatus, Profile } from './types';

/**
 * Read helpers for the manager-scoped snapshot the store derives from Convex queries.
 *
 * Writes live in `convex/` and are enforced there; nothing in this file can mutate state.
 * Keeping the reads pure means views stay declarative and testable without a backend.
 */

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
export const fail = <T,>(error: string): Result<T> => ({ ok: false, error });

/* ------------------------------------------------------------------ */
/* Reads — every read is scoped to the authenticated manager.          */
/* ------------------------------------------------------------------ */

export function listClients(db: Database, managerId: string, options: { includeArchived?: boolean } = {}) {
  return db.clients
    .filter((c) => c.manager_id === managerId)
    .filter((c) => (options.includeArchived ? true : c.archived_at === null))
    .sort((a, b) => a.business_name.localeCompare(b.business_name));
}

export function getClient(db: Database, managerId: string, clientId: string): Result<Client> {
  const client = db.clients.find((c) => c.id === clientId);
  // A record that belongs to another manager is reported as missing, never as forbidden,
  // so the UI cannot be used to probe for the existence of other tenants' data.
  if (!client || client.manager_id !== managerId) return fail('Client not found.');
  return ok(client);
}

export function listPosts(
  db: Database,
  managerId: string,
  filters: { clientId?: string; status?: PostStatus | 'all'; includeArchived?: boolean; search?: string } = {},
): Post[] {
  const search = filters.search?.trim().toLowerCase();
  return db.posts
    .filter((p) => p.manager_id === managerId)
    .filter((p) => (filters.includeArchived ? true : p.status !== 'archived'))
    .filter((p) => (filters.clientId ? p.client_id === filters.clientId : true))
    .filter((p) => (filters.status && filters.status !== 'all' ? p.status === filters.status : true))
    .filter((p) => (search ? p.title.toLowerCase().includes(search) || p.caption.toLowerCase().includes(search) : true))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getPost(db: Database, managerId: string, postId: string): Result<Post> {
  const post = db.posts.find((p) => p.id === postId);
  if (!post || post.manager_id !== managerId) return fail('Post not found.');
  return ok(post);
}

export function listFeedback(db: Database, postId: string): Feedback[] {
  return db.feedback
    .filter((f) => f.post_id === postId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function listActivity(db: Database, managerId: string, limit = 12): ActivityLog[] {
  return db.activity_logs
    .filter((a) => a.manager_id === managerId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export function getProfile(db: Database, managerId: string): Profile | undefined {
  return db.profiles.find((p) => p.id === managerId);
}

export interface DashboardStats {
  totalPosts: number;
  pendingApprovals: number;
  approvedPosts: number;
  changesRequested: number;
  drafts: number;
  archived: number;
  activeClients: number;
}

export function dashboardStats(db: Database, managerId: string): DashboardStats {
  const posts = db.posts.filter((p) => p.manager_id === managerId);
  const count = (status: PostStatus) => posts.filter((p) => p.status === status).length;
  return {
    totalPosts: posts.filter((p) => p.status !== 'archived').length,
    pendingApprovals: count('pending_approval'),
    approvedPosts: count('approved'),
    changesRequested: count('changes_requested'),
    drafts: count('draft'),
    archived: count('archived'),
    activeClients: listClients(db, managerId).length,
  };
}

/* ------------------------------------------------------------------ */
/* Calendar helpers                                                    */
/* ------------------------------------------------------------------ */

export function postsForRange(db: Database, managerId: string, startDate: string, endDate: string): Post[] {
  return db.posts
    .filter((p) => p.manager_id === managerId)
    .filter((p) => p.status !== 'archived')
    .filter((p) => p.scheduled_date >= startDate && p.scheduled_date <= endDate)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
}
