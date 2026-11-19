import { describe, expect, it, beforeEach } from 'vitest';
import {
  archiveClient,
  archivePost,
  createClient,
  createPost,
  dashboardStats,
  duplicatePost,
  getClient,
  getPost,
  getReviewPost,
  listClients,
  listFeedback,
  listPosts,
  recordDecision,
  resolveReviewSession,
  restorePost,
  rotateReviewToken,
  submitPost,
  updateClient,
  updatePost,
} from './repository';
import { createSeedDatabase, OTHER_MANAGER, OTHER_MANAGER_CLIENT, SAMPLE_CLIENTS, SAMPLE_MANAGER } from './seed';
import type { Database, PostInput } from './types';

const managerId = SAMPLE_MANAGER.id;
const fernwood = SAMPLE_CLIENTS[0];
const bloom = SAMPLE_CLIENTS[1];

let db: Database;

beforeEach(() => {
  db = createSeedDatabase();
});

const basePost: PostInput = {
  title: 'Test campaign post',
  client_id: fernwood.id,
  platform: 'instagram',
  caption: 'A caption written for a test.',
  image_url: null,
  scheduled_date: '2026-12-01',
  review_deadline: null,
  notes: null,
};

describe('tenant isolation', () => {
  it('only lists clients owned by the requesting manager', () => {
    const withOther = { ...db, clients: [...db.clients, OTHER_MANAGER_CLIENT] };
    const mine = listClients(withOther, managerId);
    expect(mine.every((c) => c.manager_id === managerId)).toBe(true);
    expect(mine.some((c) => c.id === OTHER_MANAGER_CLIENT.id)).toBe(false);
  });

  it('reports another manager client as not found rather than forbidden', () => {
    const withOther = { ...db, clients: [...db.clients, OTHER_MANAGER_CLIENT] };
    const result = getClient(withOther, managerId, OTHER_MANAGER_CLIENT.id);
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: 'Client not found.' });
  });

  it('refuses to edit or submit a post owned by another manager', () => {
    const foreignPost = { ...db.posts[0], manager_id: OTHER_MANAGER.id, id: 'pst_foreign' };
    const withForeign = { ...db, posts: [foreignPost, ...db.posts] };

    expect(getPost(withForeign, managerId, 'pst_foreign').ok).toBe(false);
    expect(updatePost(withForeign, managerId, 'pst_foreign', basePost).ok).toBe(false);
    expect(submitPost(withForeign, managerId, 'pst_foreign').ok).toBe(false);
    expect(archivePost(withForeign, managerId, 'pst_foreign').ok).toBe(false);
  });

  it('never returns another manager posts in list queries', () => {
    const foreignPost = { ...db.posts[0], manager_id: OTHER_MANAGER.id, id: 'pst_foreign' };
    const withForeign = { ...db, posts: [foreignPost, ...db.posts] };
    const listed = listPosts(withForeign, managerId, { includeArchived: true });
    expect(listed.some((p) => p.id === 'pst_foreign')).toBe(false);
  });
});

describe('client management', () => {
  it('creates a client owned by the manager with a review token', () => {
    const result = createClient(db, managerId, {
      client_name: 'Nina Alvarez',
      business_name: 'Copper Kettle',
      email: 'nina@copperkettle.test',
      profile_image_url: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.client.manager_id).toBe(managerId);
    expect(result.data.client.review_token).toMatch(/^rvt_/);
    expect(result.data.client.archived_at).toBeNull();
  });

  it('rejects malformed emails and short names', () => {
    expect(
      createClient(db, managerId, {
        client_name: 'A',
        business_name: 'B',
        email: 'not-an-email',
        profile_image_url: null,
      }).ok,
    ).toBe(false);
  });

  it('normalises the email on update and keeps ownership', () => {
    const result = updateClient(db, managerId, fernwood.id, {
      client_name: fernwood.client_name,
      business_name: fernwood.business_name,
      email: '  DANIEL@FernwoodCoffee.TEST ',
      profile_image_url: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.client.email).toBe('daniel@fernwoodcoffee.test');
    expect(result.data.client.manager_id).toBe(managerId);
  });

  it('archiving a client archives their posts and invalidates the review token', () => {
    const before = fernwood.review_token;
    const result = archiveClient(db, managerId, fernwood.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const archived = result.data.db.clients.find((c) => c.id === fernwood.id)!;
    expect(archived.archived_at).not.toBeNull();
    expect(archived.review_token).not.toBe(before);

    const theirPosts = result.data.db.posts.filter((p) => p.client_id === fernwood.id);
    expect(theirPosts.every((p) => p.status === 'archived')).toBe(true);

    expect(resolveReviewSession(result.data.db, before).ok).toBe(false);
  });
});

describe('post lifecycle', () => {
  it('creates a draft that clients cannot see', () => {
    const result = createPost(db, managerId, basePost, 'draft');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.post.status).toBe('draft');
    expect(result.data.post.submitted_at).toBeNull();

    const session = resolveReviewSession(result.data.db, fernwood.review_token);
    expect(session.ok).toBe(true);
    if (!session.ok) return;
    expect(session.data.posts.some((p) => p.id === result.data.post.id)).toBe(false);
  });

  it('submitting a draft makes it visible to the correct client only', () => {
    const created = createPost(db, managerId, basePost, 'draft');
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const submitted = submitPost(created.data.db, managerId, created.data.post.id);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.data.post.status).toBe('pending_approval');
    expect(submitted.data.post.submitted_at).not.toBeNull();

    const fernwoodSession = resolveReviewSession(submitted.data.db, fernwood.review_token);
    expect(fernwoodSession.ok).toBe(true);
    if (fernwoodSession.ok) {
      expect(fernwoodSession.data.posts.some((p) => p.id === created.data.post.id)).toBe(true);
    }

    const bloomSession = resolveReviewSession(submitted.data.db, bloom.review_token);
    expect(bloomSession.ok).toBe(true);
    if (bloomSession.ok) {
      expect(bloomSession.data.posts.some((p) => p.id === created.data.post.id)).toBe(false);
    }
  });

  it('rejects resubmitting an approved or already-pending post', () => {
    const pending = db.posts.find((p) => p.status === 'pending_approval')!;
    const approved = db.posts.find((p) => p.status === 'approved')!;
    expect(submitPost(db, managerId, pending.id).ok).toBe(false);
    expect(submitPost(db, managerId, approved.id).ok).toBe(false);
  });

  it('resubmitting after changes bumps the revision and returns to pending', () => {
    const changed = db.posts.find((p) => p.status === 'changes_requested')!;
    const result = submitPost(db, managerId, changed.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.post.status).toBe('pending_approval');
    expect(result.data.post.revision).toBe(changed.revision + 1);
  });

  it('keeps previous feedback when a revised post is resubmitted', () => {
    const changed = db.posts.find((p) => p.status === 'changes_requested')!;
    const historyBefore = listFeedback(db, changed.id).length;

    const resubmitted = submitPost(db, managerId, changed.id);
    expect(resubmitted.ok).toBe(true);
    if (!resubmitted.ok) return;

    expect(listFeedback(resubmitted.data.db, changed.id)).toHaveLength(historyBefore);
  });

  it('validates required post fields', () => {
    expect(createPost(db, managerId, { ...basePost, title: 'ab' }).ok).toBe(false);
    expect(createPost(db, managerId, { ...basePost, caption: '   ' }).ok).toBe(false);
    expect(createPost(db, managerId, { ...basePost, scheduled_date: 'not-a-date' }).ok).toBe(false);
    expect(createPost(db, managerId, { ...basePost, client_id: OTHER_MANAGER_CLIENT.id }).ok).toBe(false);
    expect(createPost(db, managerId, { ...basePost, platform: 'tiktok' as never }).ok).toBe(false);
  });

  it('duplicates a post as a new draft and archives/restores cleanly', () => {
    const source = db.posts.find((p) => p.status === 'approved')!;
    const duplicated = duplicatePost(db, managerId, source.id);
    expect(duplicated.ok).toBe(true);
    if (!duplicated.ok) return;
    expect(duplicated.data.post.id).not.toBe(source.id);
    expect(duplicated.data.post.status).toBe('draft');
    expect(duplicated.data.post.submitted_at).toBeNull();

    const archived = archivePost(duplicated.data.db, managerId, duplicated.data.post.id);
    expect(archived.ok).toBe(true);
    if (!archived.ok) return;
    expect(archived.data.db.posts.find((p) => p.id === duplicated.data.post.id)?.status).toBe('archived');

    const restored = restorePost(archived.data.db, managerId, duplicated.data.post.id);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.data.db.posts.find((p) => p.id === duplicated.data.post.id)?.status).toBe('draft');
  });
});

describe('client review portal', () => {
  const pendingPost = () => db.posts.find((p) => p.status === 'pending_approval')!;

  it('rejects unknown and empty tokens', () => {
    expect(resolveReviewSession(db, 'rvt_does_not_exist').ok).toBe(false);
    expect(resolveReviewSession(db, '').ok).toBe(false);
    expect(resolveReviewSession(db, '   ').ok).toBe(false);
  });

  it('rejects expired tokens', () => {
    const expired = { ...db, clients: db.clients.map((c) => (c.id === fernwood.id ? { ...c, review_token_expires_at: '2020-01-01T00:00:00.000Z' } : c)) };
    expect(resolveReviewSession(expired, fernwood.review_token).ok).toBe(false);
  });

  it('hides drafts from the client portal', () => {
    const session = resolveReviewSession(db, fernwood.review_token);
    expect(session.ok).toBe(true);
    if (!session.ok) return;
    expect(session.data.posts.every((p) => p.status !== 'draft' && p.status !== 'archived')).toBe(true);
  });

  it('blocks a client from opening another client post with their own token', () => {
    const foreignPost = db.posts.find((p) => p.client_id === bloom.id && p.status === 'pending_approval')!;
    expect(getReviewPost(db, fernwood.review_token, foreignPost.id).ok).toBe(false);
    expect(recordDecision(db, fernwood.review_token, foreignPost.id, {
      decision: 'approved',
      comments: '',
      expectedRevision: foreignPost.revision,
    }).ok).toBe(false);
  });

  it('records an approval with the client identity derived from the token', () => {
    const post = pendingPost();
    const result = recordDecision(db, fernwood.review_token, post.id, {
      decision: 'approved',
      comments: '',
      expectedRevision: post.revision,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.post.status).toBe('approved');
    expect(result.data.feedback.client_id).toBe(fernwood.id);
    expect(result.data.feedback.post_revision).toBe(post.revision);
  });

  it('requires a comment when requesting changes', () => {
    const post = pendingPost();
    expect(
      recordDecision(db, fernwood.review_token, post.id, {
        decision: 'changes_requested',
        comments: '   ',
        expectedRevision: post.revision,
      }).ok,
    ).toBe(false);

    const accepted = recordDecision(db, fernwood.review_token, post.id, {
      decision: 'changes_requested',
      comments: 'Please swap the hero image.',
      expectedRevision: post.revision,
    });
    expect(accepted.ok).toBe(true);
    if (accepted.ok) expect(accepted.data.post.status).toBe('changes_requested');
  });

  it('prevents duplicate decisions on the same revision', () => {
    const post = pendingPost();
    const first = recordDecision(db, fernwood.review_token, post.id, {
      decision: 'approved',
      comments: '',
      expectedRevision: post.revision,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = recordDecision(first.data.db, fernwood.review_token, post.id, {
      decision: 'approved',
      comments: '',
      expectedRevision: post.revision,
    });
    expect(second.ok).toBe(false);
  });

  it('rejects stale decisions from an out-of-date browser tab', () => {
    const post = pendingPost();
    const result = recordDecision(db, fernwood.review_token, post.id, {
      decision: 'approved',
      comments: '',
      expectedRevision: post.revision - 1,
    });
    expect(result.ok).toBe(false);
  });

  it('logs an activity entry the manager can see after a decision', () => {
    const post = pendingPost();
    const result = recordDecision(db, fernwood.review_token, post.id, {
      decision: 'changes_requested',
      comments: 'Trim the caption.',
      expectedRevision: post.revision,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const latest = result.data.db.activity_logs[0];
    expect(latest.activity_type).toBe('changes_requested');
    expect(latest.manager_id).toBe(post.manager_id);
    expect(latest.description).toContain(post.title);
  });
});

describe('review token rotation', () => {
  it('issues a new token and invalidates the old one', () => {
    const oldToken = fernwood.review_token;
    const result = rotateReviewToken(db, managerId, fernwood.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.client.review_token).not.toBe(oldToken);
    expect(resolveReviewSession(result.data.db, oldToken).ok).toBe(false);
    expect(resolveReviewSession(result.data.db, result.data.client.review_token).ok).toBe(true);
  });

  it('cannot rotate a token for another manager client', () => {
    const withOther = { ...db, clients: [...db.clients, OTHER_MANAGER_CLIENT] };
    expect(rotateReviewToken(withOther, managerId, OTHER_MANAGER_CLIENT.id).ok).toBe(false);
  });
});

describe('dashboard statistics', () => {
  it('derives figures from actual records', () => {
    const stats = dashboardStats(db, managerId);
    const mine = db.posts.filter((p) => p.manager_id === managerId);

    expect(stats.pendingApprovals).toBe(mine.filter((p) => p.status === 'pending_approval').length);
    expect(stats.approvedPosts).toBe(mine.filter((p) => p.status === 'approved').length);
    expect(stats.changesRequested).toBe(mine.filter((p) => p.status === 'changes_requested').length);
    expect(stats.drafts).toBe(mine.filter((p) => p.status === 'draft').length);
    expect(stats.archived).toBe(mine.filter((p) => p.status === 'archived').length);
    expect(stats.totalPosts).toBe(mine.filter((p) => p.status !== 'archived').length);
    expect(stats.activeClients).toBe(db.clients.filter((c) => c.manager_id === managerId && !c.archived_at).length);
  });

  it('reflects a decision immediately', () => {
    const post = db.posts.find((p) => p.status === 'pending_approval')!;
    const before = dashboardStats(db, managerId);
    const result = recordDecision(db, fernwood.review_token, post.id, {
      decision: 'approved',
      comments: '',
      expectedRevision: post.revision,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const after = dashboardStats(result.data.db, managerId);
    expect(after.approvedPosts).toBe(before.approvedPosts + 1);
    expect(after.pendingApprovals).toBe(before.pendingApprovals - 1);
  });
});
