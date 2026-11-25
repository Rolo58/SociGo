import { internalMutation } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { hashPassword } from './auth';
import { newReviewToken } from './shared';
import {
  SAMPLE_ACTIVITY,
  SAMPLE_CLIENTS,
  SAMPLE_FEEDBACK,
  SAMPLE_MANAGER,
  SAMPLE_POSTS,
} from '../src/lib/seed';

/**
 * Loads the fictional demo workspace.
 *
 * `internalMutation` means this is callable only through the CLI or another server function —
 * it is never exposed on the public API, so the demo password below cannot be used to seed
 * someone else's deployment.
 */

export const DEMO_PASSWORD = 'socigo-demo';

export const seedDemoWorkspace = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query('credentials')
      .withIndex('by_email', (q) => q.eq('email', SAMPLE_MANAGER.email))
      .unique();

    if (existing) {
      const profile = await ctx.db.get(existing.profile_id);
      return { created: false, managerId: existing.profile_id, email: profile?.email ?? SAMPLE_MANAGER.email };
    }

    const managerId = await ctx.db.insert('profiles', {
      full_name: SAMPLE_MANAGER.full_name,
      email: SAMPLE_MANAGER.email,
      business_name: SAMPLE_MANAGER.business_name,
      created_at: SAMPLE_MANAGER.created_at,
    });

    const { hash, salt } = await hashPassword(DEMO_PASSWORD);
    await ctx.db.insert('credentials', {
      profile_id: managerId,
      email: SAMPLE_MANAGER.email,
      password_hash: hash,
      password_salt: salt,
    });

    // Seed ids are human-readable strings; map them onto the inserted Convex ids.
    const clientIds = new Map<string, Id<'clients'>>();
    for (const client of SAMPLE_CLIENTS) {
      const id = await ctx.db.insert('clients', {
        manager_id: managerId,
        client_name: client.client_name,
        business_name: client.business_name,
        email: client.email,
        profile_image_url: client.profile_image_url,
        // Keep the readable demo tokens so documented review links keep working.
        review_token: client.review_token || newReviewToken(),
        review_token_expires_at: client.review_token_expires_at,
        archived_at: client.archived_at,
        created_at: client.created_at,
      });
      clientIds.set(client.id, id);
    }

    const postIds = new Map<string, Id<'posts'>>();
    for (const post of SAMPLE_POSTS) {
      const clientId = clientIds.get(post.client_id);
      if (!clientId) continue;
      const id = await ctx.db.insert('posts', {
        manager_id: managerId,
        client_id: clientId,
        title: post.title,
        platform: post.platform,
        caption: post.caption,
        image_url: post.image_url,
        scheduled_date: post.scheduled_date,
        review_deadline: post.review_deadline,
        notes: post.notes,
        status: post.status,
        revision: post.revision,
        submitted_at: post.submitted_at,
        created_at: post.created_at,
        updated_at: post.updated_at,
      });
      postIds.set(post.id, id);
    }

    for (const entry of SAMPLE_FEEDBACK) {
      const postId = postIds.get(entry.post_id);
      const clientId = clientIds.get(entry.client_id);
      if (!postId || !clientId) continue;
      await ctx.db.insert('feedback', {
        post_id: postId,
        client_id: clientId,
        manager_id: managerId,
        decision: entry.decision,
        comments: entry.comments,
        post_revision: entry.post_revision,
        created_at: entry.created_at,
      });
    }

    for (const entry of SAMPLE_ACTIVITY) {
      await ctx.db.insert('activity_logs', {
        manager_id: managerId,
        post_id: entry.post_id ? (postIds.get(entry.post_id) ?? null) : null,
        client_id: entry.client_id ? (clientIds.get(entry.client_id) ?? null) : null,
        activity_type: entry.activity_type,
        description: entry.description,
        created_at: entry.created_at,
      });
    }

    return { created: true, managerId, email: SAMPLE_MANAGER.email };
  },
});

/** Wipes every table. Destructive: intended for local resets only. */
export const resetAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = ['feedback', 'activity_logs', 'posts', 'clients', 'sessions', 'login_attempts', 'credentials', 'profiles'] as const;
    let deleted = 0;
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
        deleted += 1;
      }
    }
    return { deleted };
  },
});
