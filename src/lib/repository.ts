import type {
  ActivityLog,
  ActivityType,
  Client,
  ClientInput,
  Database,
  Decision,
  Feedback,
  Post,
  PostInput,
  PostStatus,
  Profile,
} from './types';
import { PLATFORMS } from './status';

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
export const fail = <T,>(error: string): Result<T> => ({ ok: false, error });

export class AccessDeniedError extends Error {}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function newId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

function newToken() {
  return `rvt_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function pushActivity(
  db: Database,
  managerId: string,
  activity: {
    post_id?: string | null;
    client_id?: string | null;
    activity_type: ActivityType;
    description: string;
  },
): ActivityLog {
  const log: ActivityLog = {
    id: newId('act'),
    manager_id: managerId,
    post_id: activity.post_id ?? null,
    client_id: activity.client_id ?? null,
    activity_type: activity.activity_type,
    description: activity.description,
    created_at: nowIso(),
  };
  db.activity_logs = [log, ...db.activity_logs];
  return log;
}

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
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function validateClientInput(input: ClientInput): Result<ClientInput> {
  const client_name = input.client_name.trim();
  const business_name = input.business_name.trim();
  const email = input.email.trim().toLowerCase();

  if (client_name.length < 2) return fail('Client name must be at least 2 characters.');
  if (client_name.length > 80) return fail('Client name must be 80 characters or fewer.');
  if (business_name.length < 2) return fail('Business name must be at least 2 characters.');
  if (business_name.length > 120) return fail('Business name must be 120 characters or fewer.');
  if (!EMAIL_PATTERN.test(email)) return fail('Enter a valid email address.');

  return ok({ client_name, business_name, email, profile_image_url: input.profile_image_url ?? null });
}

function validatePostInput(db: Database, managerId: string, input: PostInput): Result<PostInput> {
  const title = input.title.trim();
  const caption = input.caption.trim();

  if (title.length < 3) return fail('Post title must be at least 3 characters.');
  if (title.length > 120) return fail('Post title must be 120 characters or fewer.');
  if (!PLATFORMS.includes(input.platform)) return fail('Choose a supported platform.');
  if (!caption) return fail('Caption is required.');
  if (caption.length > 2200) return fail('Caption must be 2200 characters or fewer.');

  const client = getClient(db, managerId, input.client_id);
  if (!client.ok) return fail('Choose one of your clients for this post.');
  if (client.data.archived_at) return fail('This client is archived. Restore the client before assigning new posts.');

  if (!DATE_PATTERN.test(input.scheduled_date) || Number.isNaN(Date.parse(input.scheduled_date))) {
    return fail('Choose a valid scheduled publishing date.');
  }

  const deadline = input.review_deadline?.trim() ? input.review_deadline : null;
  if (deadline && Number.isNaN(Date.parse(deadline))) return fail('Choose a valid review deadline.');

  if (input.notes && input.notes.length > 500) return fail('Additional notes must be 500 characters or fewer.');

  return ok({
    title,
    client_id: input.client_id,
    platform: input.platform,
    caption,
    image_url: input.image_url ?? null,
    scheduled_date: input.scheduled_date,
    review_deadline: deadline,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  });
}

/* ------------------------------------------------------------------ */
/* Client writes                                                       */
/* ------------------------------------------------------------------ */

export function createClient(
  db: Database,
  managerId: string,
  input: ClientInput,
): Result<{ db: Database; client: Client }> {
  const validated = validateClientInput(input);
  if (!validated.ok) return validated;

  const duplicate = db.clients.some(
    (c) =>
      c.manager_id === managerId &&
      c.archived_at === null &&
      c.email === validated.data.email &&
      c.business_name.toLowerCase() === validated.data.business_name.toLowerCase(),
  );
  if (duplicate) return fail('You already have an active client with this email and business name.');

  const client: Client = {
    id: newId('clt'),
    manager_id: managerId,
    ...validated.data,
    review_token: newToken(),
    review_token_expires_at: null,
    archived_at: null,
    created_at: nowIso(),
  };

  const next: Database = { ...db, clients: [...db.clients, client] };
  pushActivity(next, managerId, {
    client_id: client.id,
    activity_type: 'client_created',
    description: `Added new client ${client.business_name}`,
  });

  return ok({ db: next, client });
}

export function updateClient(
  db: Database,
  managerId: string,
  clientId: string,
  input: ClientInput,
): Result<{ db: Database; client: Client }> {
  const existing = getClient(db, managerId, clientId);
  if (!existing.ok) return existing;

  const validated = validateClientInput(input);
  if (!validated.ok) return validated;

  const client: Client = { ...existing.data, ...validated.data };
  const next: Database = {
    ...db,
    clients: db.clients.map((c) => (c.id === clientId ? client : c)),
  };
  pushActivity(next, managerId, {
    client_id: client.id,
    activity_type: 'client_updated',
    description: `Updated client details for ${client.business_name}`,
  });

  return ok({ db: next, client });
}

/**
 * Soft-deletes a client. Their posts and feedback history are retained but moved to the
 * archive so no other manager (and no live review link) can reach them.
 */
export function archiveClient(db: Database, managerId: string, clientId: string): Result<{ db: Database }> {
  const existing = getClient(db, managerId, clientId);
  if (!existing.ok) return existing;

  const stamp = nowIso();
  const next: Database = {
    ...db,
    clients: db.clients.map((c) =>
      c.id === clientId ? { ...c, archived_at: stamp, review_token: newToken() } : c,
    ),
    posts: db.posts.map((p) =>
      p.client_id === clientId && p.manager_id === managerId && p.status !== 'archived'
        ? { ...p, status: 'archived', updated_at: stamp }
        : p,
    ),
  };
  pushActivity(next, managerId, {
    client_id: clientId,
    activity_type: 'client_updated',
    description: `Archived client ${existing.data.business_name}`,
  });

  return ok({ db: next });
}

export function restoreClient(db: Database, managerId: string, clientId: string): Result<{ db: Database }> {
  const existing = getClient(db, managerId, clientId);
  if (!existing.ok) return existing;

  const next: Database = {
    ...db,
    clients: db.clients.map((c) => (c.id === clientId ? { ...c, archived_at: null } : c)),
  };
  pushActivity(next, managerId, {
    client_id: clientId,
    activity_type: 'client_updated',
    description: `Restored client ${existing.data.business_name}`,
  });
  return ok({ db: next });
}

export function rotateReviewToken(
  db: Database,
  managerId: string,
  clientId: string,
): Result<{ db: Database; client: Client }> {
  const existing = getClient(db, managerId, clientId);
  if (!existing.ok) return existing;

  const client: Client = { ...existing.data, review_token: newToken() };
  const next: Database = {
    ...db,
    clients: db.clients.map((c) => (c.id === clientId ? client : c)),
  };
  pushActivity(next, managerId, {
    client_id: clientId,
    activity_type: 'client_updated',
    description: `Issued a new review link for ${client.business_name}`,
  });
  return ok({ db: next, client });
}

/* ------------------------------------------------------------------ */
/* Post writes                                                         */
/* ------------------------------------------------------------------ */

export function createPost(
  db: Database,
  managerId: string,
  input: PostInput,
  status: Extract<PostStatus, 'draft' | 'pending_approval'> = 'draft',
): Result<{ db: Database; post: Post }> {
  const validated = validatePostInput(db, managerId, input);
  if (!validated.ok) return validated;

  const stamp = nowIso();
  const post: Post = {
    id: newId('pst'),
    manager_id: managerId,
    ...validated.data,
    status,
    revision: 1,
    submitted_at: status === 'pending_approval' ? stamp : null,
    created_at: stamp,
    updated_at: stamp,
  };

  const next: Database = { ...db, posts: [post, ...db.posts] };
  pushActivity(next, managerId, {
    post_id: post.id,
    client_id: post.client_id,
    activity_type: 'post_created',
    description: `Created ${status === 'draft' ? 'draft' : 'post'} "${post.title}"`,
  });
  if (status === 'pending_approval') {
    const client = db.clients.find((c) => c.id === post.client_id);
    pushActivity(next, managerId, {
      post_id: post.id,
      client_id: post.client_id,
      activity_type: 'post_submitted',
      description: `Submitted "${post.title}" to ${client?.business_name ?? 'client'}`,
    });
  }

  return ok({ db: next, post });
}

export function updatePost(
  db: Database,
  managerId: string,
  postId: string,
  input: PostInput,
): Result<{ db: Database; post: Post }> {
  const existing = getPost(db, managerId, postId);
  if (!existing.ok) return existing;
  if (existing.data.status === 'archived') return fail('Restore this post before editing it.');

  const validated = validatePostInput(db, managerId, input);
  if (!validated.ok) return validated;

  const post: Post = { ...existing.data, ...validated.data, updated_at: nowIso() };
  const next: Database = {
    ...db,
    posts: db.posts.map((p) => (p.id === postId ? post : p)),
  };
  pushActivity(next, managerId, {
    post_id: post.id,
    client_id: post.client_id,
    activity_type: 'post_updated',
    description: `Updated "${post.title}"`,
  });

  return ok({ db: next, post });
}

/**
 * Moves a draft or a changes-requested post into Pending Approval.
 * Resubmitting after feedback bumps the revision so previous decisions stay in history.
 */
export function submitPost(db: Database, managerId: string, postId: string): Result<{ db: Database; post: Post }> {
  const existing = getPost(db, managerId, postId);
  if (!existing.ok) return existing;

  const post = existing.data;
  if (post.status === 'pending_approval') return fail('This post is already waiting for the client.');
  if (post.status === 'approved') return fail('Approved posts cannot be resubmitted. Create a new revision instead.');
  if (post.status === 'archived') return fail('Restore this post before submitting it.');

  const client = db.clients.find((c) => c.id === post.client_id);
  if (!client || client.manager_id !== managerId) return fail('This post is not linked to one of your clients.');
  if (client.archived_at) return fail('This client is archived, so the review link is disabled.');

  const isRevision = post.status === 'changes_requested';
  const stamp = nowIso();
  const updated: Post = {
    ...post,
    status: 'pending_approval',
    revision: isRevision ? post.revision + 1 : post.revision,
    submitted_at: stamp,
    updated_at: stamp,
  };

  const next: Database = {
    ...db,
    posts: db.posts.map((p) => (p.id === postId ? updated : p)),
  };
  pushActivity(next, managerId, {
    post_id: updated.id,
    client_id: updated.client_id,
    activity_type: 'post_submitted',
    description: `${isRevision ? 'Resubmitted revision ' + updated.revision + ' of' : 'Submitted'} "${updated.title}" to ${client.business_name}`,
  });

  return ok({ db: next, post: updated });
}

export function duplicatePost(db: Database, managerId: string, postId: string): Result<{ db: Database; post: Post }> {
  const existing = getPost(db, managerId, postId);
  if (!existing.ok) return existing;

  const stamp = nowIso();
  const copy: Post = {
    ...existing.data,
    id: newId('pst'),
    title: `${existing.data.title} (copy)`.slice(0, 120),
    status: 'draft',
    revision: 1,
    submitted_at: null,
    created_at: stamp,
    updated_at: stamp,
  };

  const next: Database = { ...db, posts: [copy, ...db.posts] };
  pushActivity(next, managerId, {
    post_id: copy.id,
    client_id: copy.client_id,
    activity_type: 'post_duplicated',
    description: `Duplicated "${existing.data.title}" as a new draft`,
  });

  return ok({ db: next, post: copy });
}

export function archivePost(db: Database, managerId: string, postId: string): Result<{ db: Database }> {
  const existing = getPost(db, managerId, postId);
  if (!existing.ok) return existing;

  const next: Database = {
    ...db,
    posts: db.posts.map((p) => (p.id === postId ? { ...p, status: 'archived', updated_at: nowIso() } : p)),
  };
  pushActivity(next, managerId, {
    post_id: postId,
    client_id: existing.data.client_id,
    activity_type: 'post_archived',
    description: `Archived "${existing.data.title}"`,
  });
  return ok({ db: next });
}

export function restorePost(
  db: Database,
  managerId: string,
  postId: string,
): Result<{ db: Database }> {
  const existing = getPost(db, managerId, postId);
  if (!existing.ok) return existing;
  if (existing.data.status !== 'archived') return fail('Only archived posts can be restored.');

  const next: Database = {
    ...db,
    posts: db.posts.map((p) => (p.id === postId ? { ...p, status: 'draft', updated_at: nowIso() } : p)),
  };
  pushActivity(next, managerId, {
    post_id: postId,
    client_id: existing.data.client_id,
    activity_type: 'post_restored',
    description: `Restored "${existing.data.title}" as a draft`,
  });
  return ok({ db: next });
}

/* ------------------------------------------------------------------ */
/* Client review portal — token based, never trusts a browser-sent id   */
/* ------------------------------------------------------------------ */

export interface ReviewSession {
  client: Client;
  manager: Profile | undefined;
  posts: Post[];
}

/**
 * Resolves a review link. The token is the only credential; a client id from the browser is
 * never accepted. Expired tokens, archived clients and unknown tokens all fail the same way.
 */
export function resolveReviewSession(db: Database, token: string): Result<ReviewSession> {
  const trimmed = token?.trim();
  if (!trimmed) return fail('This review link is not valid.');

  const client = db.clients.find((c) => c.review_token === trimmed);
  if (!client) return fail('This review link is not valid or has been replaced.');
  if (client.archived_at) return fail('This review link has been closed by the manager.');

  if (client.review_token_expires_at && Date.parse(client.review_token_expires_at) < Date.now()) {
    return fail('This review link has expired. Ask your manager to send a new one.');
  }

  const posts = db.posts
    .filter((p) => p.client_id === client.id)
    .filter((p) => p.status !== 'draft' && p.status !== 'archived')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return ok({ client, manager: db.profiles.find((p) => p.id === client.manager_id), posts });
}

export function getReviewPost(db: Database, token: string, postId: string): Result<{ session: ReviewSession; post: Post }> {
  const session = resolveReviewSession(db, token);
  if (!session.ok) return session;

  const post = session.data.posts.find((p) => p.id === postId);
  if (!post) return fail('That post is not available on this review link.');
  return ok({ session: session.data, post });
}

export interface DecisionInput {
  decision: Decision;
  comments: string;
  /** Revision the client was shown; rejects stale submissions from an old browser tab. */
  expectedRevision: number;
}

export function recordDecision(
  db: Database,
  token: string,
  postId: string,
  input: DecisionInput,
): Result<{ db: Database; post: Post; feedback: Feedback }> {
  const resolved = getReviewPost(db, token, postId);
  if (!resolved.ok) return resolved;

  const { session, post } = resolved.data;

  if (post.status !== 'pending_approval') {
    return fail(
      post.status === 'approved'
        ? 'This post has already been approved.'
        : 'This post is no longer waiting for your review.',
    );
  }

  if (input.expectedRevision !== post.revision) {
    return fail('This content was updated after you opened it. Reload the page to review the latest version.');
  }

  const alreadyDecided = db.feedback.some((f) => f.post_id === postId && f.post_revision === post.revision);
  if (alreadyDecided) return fail('A decision has already been recorded for this version of the post.');

  const comments = input.comments.trim();
  if (input.decision === 'changes_requested' && comments.length < 5) {
    return fail('Please tell the manager what needs to change (at least 5 characters).');
  }
  if (comments.length > 1000) return fail('Feedback must be 1000 characters or fewer.');

  const stamp = nowIso();
  const feedback: Feedback = {
    id: newId('fbk'),
    post_id: postId,
    client_id: session.client.id,
    decision: input.decision,
    comments,
    post_revision: post.revision,
    created_at: stamp,
  };

  const updated: Post = {
    ...post,
    status: input.decision === 'approved' ? 'approved' : 'changes_requested',
    updated_at: stamp,
  };

  const next: Database = {
    ...db,
    posts: db.posts.map((p) => (p.id === postId ? updated : p)),
    feedback: [feedback, ...db.feedback],
  };

  pushActivity(next, post.manager_id, {
    post_id: postId,
    client_id: session.client.id,
    activity_type: input.decision === 'approved' ? 'post_approved' : 'changes_requested',
    description:
      input.decision === 'approved'
        ? `${session.client.client_name} approved "${post.title}"`
        : `${session.client.client_name} requested changes on "${post.title}"`,
  });

  return ok({ db: next, post: updated, feedback });
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
