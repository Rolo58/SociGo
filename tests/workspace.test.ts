import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';

/** Exercises the real Convex runtime through convex-test (no mocks, real database). */
const modules = import.meta.glob('../convex/**/!(*.test).ts');

type T = ReturnType<typeof convexTest>;

async function signUp(t: T, email: string, name = 'Test Manager') {
  return t.mutation(api.accounts.register, {
    full_name: name,
    business_name: `${name} Studio`,
    email,
    password: 'correct-horse-battery',
  });
}

async function addClient(t: T, token: string, business: string) {
  return t.mutation(api.clients.create, {
    token,
    input: {
      client_name: `${business} Contact`,
      business_name: business,
      email: `${business.toLowerCase().replace(/\s+/g, '')}@example.test`,
      profile_image_url: null,
    },
  });
}

async function addPost(t: T, token: string, clientId: string, submit = false) {
  return t.mutation(api.posts.create, {
    token,
    submit,
    input: {
      title: 'Autumn launch post',
      client_id: clientId as Id<'clients'>,
      platform: 'instagram',
      caption: 'A caption that is long enough to pass validation.',
      image_url: null,
      scheduled_date: '2026-12-01',
      review_deadline: null,
      notes: null,
    },
  });
}

describe('authentication', () => {
  it('registers a manager and issues a session token', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    const me = await t.query(api.accounts.me, { token });
    expect(me?.email).toBe('owner@studio.test');
  });

  it('rejects a duplicate email', async () => {
    const t = convexTest(schema, modules);
    await signUp(t, 'owner@studio.test');
    await expect(signUp(t, 'owner@studio.test')).rejects.toThrow(/already exists/i);
  });

  it('never stores the raw password', async () => {
    const t = convexTest(schema, modules);
    await signUp(t, 'owner@studio.test');
    const rows = await t.run(async (ctx) => ctx.db.query('credentials').collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].password_hash).not.toContain('correct-horse-battery');
    expect(rows[0].password_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('logs in with the right password and rejects the wrong one', async () => {
    const t = convexTest(schema, modules);
    await signUp(t, 'owner@studio.test');
    const ok = await t.mutation(api.accounts.login, {
      email: 'owner@studio.test',
      password: 'correct-horse-battery',
    });
    expect(ok.token).toBeTruthy();
    await expect(
      t.mutation(api.accounts.login, { email: 'owner@studio.test', password: 'wrong-password' }),
    ).rejects.toThrow(/incorrect/i);
  });

  it('treats unknown, empty and logged-out tokens as unauthenticated', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');

    await expect(t.query(api.clients.list, { token: '' })).rejects.toThrow(/session/i);
    await expect(t.query(api.clients.list, { token: 'f'.repeat(64) })).rejects.toThrow(/session/i);

    await t.mutation(api.accounts.logout, { token });
    await expect(t.query(api.clients.list, { token })).rejects.toThrow(/session/i);
  });

  it('resolves an unknown token to a null profile so the UI can sign out cleanly', async () => {
    const t = convexTest(schema, modules);
    await signUp(t, 'owner@studio.test');

    expect(await t.query(api.accounts.me, { token: 'f'.repeat(64) })).toBeNull();
    expect(await t.query(api.accounts.me, { token: null })).toBeNull();
    // Scoped reads still refuse the unknown token, which is why the UI waits for `me`.
    await expect(t.query(api.clients.list, { token: 'f'.repeat(64) })).rejects.toThrow(/session/i);
  });

  it('does not reveal whether an email exists when login fails', async () => {
    const t = convexTest(schema, modules);
    await signUp(t, 'owner@studio.test');
    const missing = t.mutation(api.accounts.login, { email: 'nobody@studio.test', password: 'whatever-long' });
    const wrong = t.mutation(api.accounts.login, { email: 'owner@studio.test', password: 'whatever-long' });
    await expect(missing).rejects.toThrow('Email or password is incorrect.');
    await expect(wrong).rejects.toThrow('Email or password is incorrect.');
  });
});

describe('tenant isolation', () => {
  it('keeps one manager from reading another manager clients', async () => {
    const t = convexTest(schema, modules);
    const a = await signUp(t, 'a@studio.test', 'Anna');
    const b = await signUp(t, 'b@studio.test', 'Ben');

    const client = await addClient(t, a.token, 'Fernwood Coffee');
    const seenByA = await t.query(api.clients.list, { token: a.token });
    const seenByB = await t.query(api.clients.list, { token: b.token });

    expect(seenByA.map((c) => c.business_name)).toContain('Fernwood Coffee');
    expect(seenByB).toHaveLength(0);
    expect(await t.query(api.clients.get, { token: b.token, clientId: client.id })).toBeNull();
  });

  it('refuses to edit, archive or rotate another manager client', async () => {
    const t = convexTest(schema, modules);
    const a = await signUp(t, 'a@studio.test', 'Anna');
    const b = await signUp(t, 'b@studio.test', 'Ben');
    const client = await addClient(t, a.token, 'Fernwood Coffee');

    const input = {
      client_name: 'Hijack',
      business_name: 'Hijack Ltd',
      email: 'hijack@example.test',
      profile_image_url: null,
    };
    await expect(t.mutation(api.clients.update, { token: b.token, clientId: client.id, input })).rejects.toThrow(
      'Client not found.',
    );
    await expect(t.mutation(api.clients.archive, { token: b.token, clientId: client.id })).rejects.toThrow(
      'Client not found.',
    );
    await expect(t.mutation(api.clients.rotateToken, { token: b.token, clientId: client.id })).rejects.toThrow(
      'Client not found.',
    );
  });

  it('hides another manager posts and blocks status changes on them', async () => {
    const t = convexTest(schema, modules);
    const a = await signUp(t, 'a@studio.test', 'Anna');
    const b = await signUp(t, 'b@studio.test', 'Ben');
    const client = await addClient(t, a.token, 'Fernwood Coffee');
    const post = await addPost(t, a.token, client.id);

    expect(await t.query(api.posts.get, { token: b.token, postId: post.id })).toBeNull();
    expect(await t.query(api.posts.list, { token: b.token })).toHaveLength(0);
    await expect(t.mutation(api.posts.submit, { token: b.token, postId: post.id })).rejects.toThrow('Post not found.');
    await expect(t.mutation(api.posts.archive, { token: b.token, postId: post.id })).rejects.toThrow('Post not found.');
    await expect(
      t.mutation(api.posts.update, {
        token: b.token,
        postId: post.id,
        input: {
          title: 'Hijacked',
          client_id: client.id,
          platform: 'instagram',
          caption: 'Hijacked caption.',
          image_url: null,
          scheduled_date: '2026-12-05',
          review_deadline: null,
          notes: null,
        },
      }),
    ).rejects.toThrow('Post not found.');
  });

  it('will not let a manager attach a post to another manager client', async () => {
    const t = convexTest(schema, modules);
    const a = await signUp(t, 'a@studio.test', 'Anna');
    const b = await signUp(t, 'b@studio.test', 'Ben');
    const foreign = await addClient(t, a.token, 'Fernwood Coffee');

    await expect(addPost(t, b.token, foreign.id)).rejects.toThrow('Choose one of your clients');
  });
});

describe('post lifecycle', () => {
  it('creates drafts that clients cannot see', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id);

    expect(post.status).toBe('draft');
    const session = await t.query(api.review.session, { token: client.review_token });
    expect(session.ok).toBe(true);
    if (session.ok) expect(session.posts).toHaveLength(0);
  });

  it('moves a draft to pending approval and makes it visible to the client', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id);

    const submitted = await t.mutation(api.posts.submit, { token, postId: post.id });
    expect(submitted.status).toBe('pending_approval');
    expect(submitted.submitted_at).not.toBeNull();

    const session = await t.query(api.review.session, { token: client.review_token });
    if (session.ok) expect(session.posts.map((p) => p.id)).toEqual([post.id]);
  });

  it('refuses to submit twice and refuses to resubmit an approved post', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id, true);

    await expect(t.mutation(api.posts.submit, { token, postId: post.id })).rejects.toThrow(/already waiting/i);

    await t.mutation(api.review.decide, {
      token: client.review_token,
      postId: post.id,
      decision: 'approved',
      comments: '',
      expectedRevision: 1,
    });
    await expect(t.mutation(api.posts.submit, { token, postId: post.id })).rejects.toThrow(/approved posts/i);
  });

  it('bumps the revision when a changes-requested post is resubmitted', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id, true);

    await t.mutation(api.review.decide, {
      token: client.review_token,
      postId: post.id,
      decision: 'changes_requested',
      comments: 'Please lead with the farmers story.',
      expectedRevision: 1,
    });

    const resubmitted = await t.mutation(api.posts.submit, { token, postId: post.id });
    expect(resubmitted.revision).toBe(2);
    expect(resubmitted.status).toBe('pending_approval');
  });

  it('archives and restores a post', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id);

    await t.mutation(api.posts.archive, { token, postId: post.id });
    expect(await t.query(api.posts.list, { token })).toHaveLength(0);

    await t.mutation(api.posts.restore, { token, postId: post.id });
    const restored = await t.query(api.posts.get, { token, postId: post.id });
    expect(restored?.status).toBe('draft');
  });

  it('archiving a client archives their posts and invalidates the review link', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id, true);
    const oldToken = client.review_token;

    await t.mutation(api.clients.archive, { token, clientId: client.id });

    const session = await t.query(api.review.session, { token: oldToken });
    expect(session.ok).toBe(false);
    const archived = await t.query(api.posts.get, { token, postId: post.id });
    expect(archived?.status).toBe('archived');
  });
});

describe('client review portal', () => {
  it('rejects unknown and archived review tokens', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');

    const unknown = await t.query(api.review.session, { token: 'rvt_not_a_real_token' });
    expect(unknown.ok).toBe(false);

    await t.mutation(api.clients.archive, { token, clientId: client.id });
    const closed = await t.query(api.review.session, { token: client.review_token });
    expect(closed.ok).toBe(false);
  });

  it('records an approval with the client identity taken from the token', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id, true);

    const result = await t.mutation(api.review.decide, {
      token: client.review_token,
      postId: post.id,
      decision: 'approved',
      comments: '',
      expectedRevision: 1,
    });

    expect(result.post.status).toBe('approved');
    expect(result.feedback.client_id).toBe(client.id);
    expect(result.feedback.decision).toBe('approved');

    const stored = await t.query(api.posts.get, { token, postId: post.id });
    expect(stored?.status).toBe('approved');
  });

  it('requires a comment when requesting changes', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id, true);

    await expect(
      t.mutation(api.review.decide, {
        token: client.review_token,
        postId: post.id,
        decision: 'changes_requested',
        comments: 'no',
        expectedRevision: 1,
      }),
    ).rejects.toThrow(/what needs to change/i);
  });

  it('blocks a client from acting on another client post', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const fernwood = await addClient(t, token, 'Fernwood Coffee');
    const bloom = await addClient(t, token, 'Bloom Birch');
    const post = await addPost(t, token, fernwood.id, true);

    await expect(
      t.mutation(api.review.decide, {
        token: bloom.review_token,
        postId: post.id,
        decision: 'approved',
        comments: '',
        expectedRevision: 1,
      }),
    ).rejects.toThrow(/not available on this review link/i);

    expect(await t.query(api.review.post, { token: bloom.review_token, postId: post.id })).toMatchObject({
      ok: false,
    });
  });

  it('records one decision per revision and rejects a stale tab', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id, true);

    await t.mutation(api.review.decide, {
      token: client.review_token,
      postId: post.id,
      decision: 'changes_requested',
      comments: 'Make the headline shorter please.',
      expectedRevision: 1,
    });

    await expect(
      t.mutation(api.review.decide, {
        token: client.review_token,
        postId: post.id,
        decision: 'approved',
        comments: '',
        expectedRevision: 1,
      }),
    ).rejects.toThrow(/no longer waiting/i);

    await t.mutation(api.posts.submit, { token, postId: post.id });
    await expect(
      t.mutation(api.review.decide, {
        token: client.review_token,
        postId: post.id,
        decision: 'approved',
        comments: '',
        expectedRevision: 1,
      }),
    ).rejects.toThrow(/updated after you opened it/i);
  });

  it('keeps every decision in the feedback history', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id, true);

    await t.mutation(api.review.decide, {
      token: client.review_token,
      postId: post.id,
      decision: 'changes_requested',
      comments: 'Please warm up the opening line.',
      expectedRevision: 1,
    });
    await t.mutation(api.posts.submit, { token, postId: post.id });
    await t.mutation(api.review.decide, {
      token: client.review_token,
      postId: post.id,
      decision: 'approved',
      comments: 'Perfect now.',
      expectedRevision: 2,
    });

    const history = await t.query(api.dashboard.postFeedback, { token, postId: post.id });
    expect(history).toHaveLength(2);
    expect(history.map((h) => h.decision)).toEqual(['approved', 'changes_requested']);
    expect(history[1].comments).toContain('warm up');
  });

  it('writes an activity entry the manager can see after a decision', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id, true);

    await t.mutation(api.review.decide, {
      token: client.review_token,
      postId: post.id,
      decision: 'changes_requested',
      comments: 'Swap the image for the new one.',
      expectedRevision: 1,
    });

    const activity = await t.query(api.dashboard.activity, { token });
    expect(activity[0].activity_type).toBe('changes_requested');
    expect(activity[0].description).toContain('requested changes');
  });
});

describe('dashboard and calendar', () => {
  it('computes stats from live rows', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    await addPost(t, token, client.id, true);
    await addPost(t, token, client.id);

    const stats = await t.query(api.dashboard.stats, { token });
    expect(stats.totalPosts).toBe(2);
    expect(stats.pendingApprovals).toBe(1);
    expect(stats.drafts).toBe(1);
    expect(stats.activeClients).toBe(1);
  });

  it('returns scheduled posts inside the range', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    await addPost(t, token, client.id);

    const inside = await t.query(api.dashboard.scheduled, { token, startDate: '2026-11-01', endDate: '2026-12-31' });
    const outside = await t.query(api.dashboard.scheduled, { token, startDate: '2027-01-01', endDate: '2027-02-01' });
    expect(inside).toHaveLength(1);
    expect(outside).toHaveLength(0);
  });
});

describe('account deletion', () => {
  it('removes the account and everything it owns', async () => {
    const t = convexTest(schema, modules);
    const { token } = await signUp(t, 'owner@studio.test');
    const client = await addClient(t, token, 'Fernwood Coffee');
    const post = await addPost(t, token, client.id, true);
    await t.mutation(api.review.decide, {
      token: client.review_token,
      postId: post.id,
      decision: 'approved',
      comments: '',
      expectedRevision: 1,
    });

    await expect(t.mutation(api.accounts.deleteAccount, { token, confirm_email: 'wrong@studio.test' })).rejects.toThrow(
      /type your email/i,
    );

    await t.mutation(api.accounts.deleteAccount, { token, confirm_email: 'owner@studio.test' });

    const counts = await t.run(async (ctx) => ({
      profiles: (await ctx.db.query('profiles').collect()).length,
      credentials: (await ctx.db.query('credentials').collect()).length,
      clients: (await ctx.db.query('clients').collect()).length,
      posts: (await ctx.db.query('posts').collect()).length,
      feedback: (await ctx.db.query('feedback').collect()).length,
      activity: (await ctx.db.query('activity_logs').collect()).length,
      sessions: (await ctx.db.query('sessions').collect()).length,
    }));
    expect(counts).toEqual({
      profiles: 0,
      credentials: 0,
      clients: 0,
      posts: 0,
      feedback: 0,
      activity: 0,
      sessions: 0,
    });
  });
});

