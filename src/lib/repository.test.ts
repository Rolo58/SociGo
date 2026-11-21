import { describe, expect, it } from 'vitest';
import { dashboardStats, getClient, getPost, listClients, listFeedback, listPosts, postsForRange } from './repository';
import { createSeedDatabase, OTHER_MANAGER, OTHER_MANAGER_CLIENT, SAMPLE_CLIENTS, SAMPLE_MANAGER } from './seed';

const managerId = SAMPLE_MANAGER.id;
const db = createSeedDatabase();

describe('manager-scoped reads', () => {
  it('lists only the signed-in manager clients', () => {
    const clients = listClients(db, managerId);
    expect(clients).toHaveLength(SAMPLE_CLIENTS.filter((c) => c.archived_at === null).length);
    expect(clients.every((c) => c.manager_id === managerId)).toBe(true);
  });

  it('hides archived clients unless asked for them', () => {
    const withArchived = listClients(db, managerId, { includeArchived: true });
    expect(withArchived.length).toBeGreaterThanOrEqual(listClients(db, managerId).length);
  });

  it('reports another manager client as missing, never as forbidden', () => {
    const result = getClient(db, managerId, OTHER_MANAGER_CLIENT.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Client not found.');
  });

  it('scopes posts to the manager and excludes archived by default', () => {
    const posts = listPosts(db, managerId);
    expect(posts.every((p) => p.manager_id === managerId && p.status !== 'archived')).toBe(true);
  });

  it('filters posts by client and status', () => {
    const clientId = SAMPLE_CLIENTS[0].id;
    const posts = listPosts(db, managerId, { clientId, status: 'pending_approval' });
    expect(posts.every((p) => p.client_id === clientId && p.status === 'pending_approval')).toBe(true);
  });

  it('reports a post owned by another manager as missing', () => {
    const foreign = db.posts.find((p) => p.manager_id === OTHER_MANAGER.id);
    if (!foreign) return;
    const result = getPost(db, managerId, foreign.id);
    expect(result.ok).toBe(false);
  });

  it('returns feedback newest first', () => {
    const post = db.feedback[0];
    const history = listFeedback(db, post.post_id);
    const sorted = [...history].sort((a, b) => b.created_at.localeCompare(a.created_at));
    expect(history.map((h) => h.id)).toEqual(sorted.map((h) => h.id));
  });

  it('derives dashboard figures from live rows', () => {
    const stats = dashboardStats(db, managerId);
    const active = db.posts.filter((p) => p.manager_id === managerId && p.status !== 'archived');
    expect(stats.totalPosts).toBe(active.length);
    expect(stats.pendingApprovals).toBe(active.filter((p) => p.status === 'pending_approval').length);
    expect(stats.approvedPosts).toBe(active.filter((p) => p.status === 'approved').length);
    expect(stats.activeClients).toBe(listClients(db, managerId).length);
  });

  it('returns calendar posts inside the requested range only', () => {
    const all = postsForRange(db, managerId, '2000-01-01', '2099-12-31');
    expect(all.every((p) => p.status !== 'archived')).toBe(true);
    const narrow = postsForRange(db, managerId, '2000-01-01', '2000-01-02');
    expect(narrow).toHaveLength(0);
  });
});
