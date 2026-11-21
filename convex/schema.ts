import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Mirrors the PostgreSQL schema in PRD section 6, with the additions the workflow needs
 * (review tokens, revisions, archives). Every table is scoped by `manager_id` except
 * `feedback`, which is reached through its post.
 */

export const postStatus = v.union(
  v.literal('draft'),
  v.literal('pending_approval'),
  v.literal('approved'),
  v.literal('changes_requested'),
  v.literal('archived'),
);

export const platform = v.union(v.literal('instagram'), v.literal('facebook'), v.literal('linkedin'));

export const decision = v.union(v.literal('approved'), v.literal('changes_requested'));

export const activityType = v.union(
  v.literal('client_created'),
  v.literal('client_updated'),
  v.literal('post_created'),
  v.literal('post_updated'),
  v.literal('post_submitted'),
  v.literal('post_approved'),
  v.literal('changes_requested'),
  v.literal('post_duplicated'),
  v.literal('post_archived'),
  v.literal('post_restored'),
);

export default defineSchema({
  /** Table 1: profiles. One row per manager account. */
  profiles: defineTable({
    full_name: v.string(),
    email: v.string(),
    business_name: v.string(),
    created_at: v.string(),
  }).index('by_email', ['email']),

  /** Credentials are split from profiles so a profile read never ships a password hash. */
  credentials: defineTable({
    profile_id: v.id('profiles'),
    email: v.string(),
    password_hash: v.string(),
    password_salt: v.string(),
  }).index('by_email', ['email']),

  /** Opaque bearer sessions. The browser holds the raw token; the database holds its hash. */
  sessions: defineTable({
    token_hash: v.string(),
    profile_id: v.id('profiles'),
    created_at: v.number(),
    expires_at: v.number(),
  })
    .index('by_token_hash', ['token_hash'])
    .index('by_profile', ['profile_id']),

  /** Failed-login counters, keyed by email so a lockout survives credential checks. */
  login_attempts: defineTable({
    email: v.string(),
    failed_count: v.number(),
    locked_until: v.number(),
  }).index('by_email', ['email']),

  /** Table 2: clients. */
  clients: defineTable({
    manager_id: v.id('profiles'),
    client_name: v.string(),
    business_name: v.string(),
    email: v.string(),
    profile_image_url: v.union(v.string(), v.null()),
    review_token: v.string(),
    review_token_expires_at: v.union(v.string(), v.null()),
    archived_at: v.union(v.string(), v.null()),
    created_at: v.string(),
  })
    .index('by_manager', ['manager_id'])
    .index('by_review_token', ['review_token'])
    .index('by_manager_email', ['manager_id', 'email']),

  /** Table 3: posts. */
  posts: defineTable({
    manager_id: v.id('profiles'),
    client_id: v.id('clients'),
    title: v.string(),
    platform,
    caption: v.string(),
    image_url: v.union(v.string(), v.null()),
    scheduled_date: v.string(),
    review_deadline: v.union(v.string(), v.null()),
    notes: v.union(v.string(), v.null()),
    status: postStatus,
    revision: v.number(),
    submitted_at: v.union(v.string(), v.null()),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index('by_manager', ['manager_id'])
    .index('by_manager_updated', ['manager_id', 'updated_at'])
    .index('by_client', ['client_id'])
    .index('by_manager_scheduled', ['manager_id', 'scheduled_date']),

  /** Table 4: feedback. One row per client decision, kept forever as history. */
  feedback: defineTable({
    post_id: v.id('posts'),
    client_id: v.id('clients'),
    manager_id: v.id('profiles'),
    decision,
    comments: v.string(),
    post_revision: v.number(),
    created_at: v.string(),
  })
    .index('by_post', ['post_id'])
    .index('by_post_revision', ['post_id', 'post_revision']),

  /** Table 5: activity_logs. */
  activity_logs: defineTable({
    manager_id: v.id('profiles'),
    post_id: v.union(v.id('posts'), v.null()),
    client_id: v.union(v.id('clients'), v.null()),
    activity_type: activityType,
    description: v.string(),
    created_at: v.string(),
  }).index('by_manager_created', ['manager_id', 'created_at']),
});
