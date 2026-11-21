import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  createSession,
  deleteSession,
  getSessionProfile,
  hashPassword,
  requireManager,
  verifyPassword,
} from './auth';
import { EMAIL_PATTERN, LIMITS } from '../src/lib/validation';

const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_MS = 1000 * 60 * 10;

export const register = mutation({
  args: {
    full_name: v.string(),
    business_name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const full_name = args.full_name.trim();
    const business_name = args.business_name.trim();
    const email = args.email.trim().toLowerCase();

    if (full_name.length < LIMITS.fullName.min) throw new ConvexError('Enter your full name.');
    if (full_name.length > LIMITS.fullName.max) throw new ConvexError('Full name must be 80 characters or fewer.');
    if (business_name.length < LIMITS.businessName.min) throw new ConvexError('Enter your studio or agency name.');
    if (business_name.length > LIMITS.businessName.max) throw new ConvexError('Business name must be 120 characters or fewer.');
    if (!EMAIL_PATTERN.test(email)) throw new ConvexError('Enter a valid email address.');
    if (args.password.length < LIMITS.password.min) throw new ConvexError('Use at least 8 characters for your password.');
    if (args.password.length > LIMITS.password.max) throw new ConvexError('Password must be 200 characters or fewer.');

    const existing = await ctx.db
      .query('credentials')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    if (existing) throw new ConvexError('An account with this email already exists.');

    const { hash, salt } = await hashPassword(args.password);
    const profileId = await ctx.db.insert('profiles', {
      full_name,
      business_name,
      email,
      created_at: new Date().toISOString(),
    });
    await ctx.db.insert('credentials', {
      profile_id: profileId,
      email,
      password_hash: hash,
      password_salt: salt,
    });

    const token = await createSession(ctx, profileId);
    return { token };
  },
});

export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const genericError = 'Email or password is incorrect.';

    const credential = await ctx.db
      .query('credentials')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    if (!credential) {
      // Burn comparable time so a missing account is not obviously faster to probe.
      await hashPassword(args.password);
      throw new ConvexError(genericError);
    }

    const attempts = await ctx.db
      .query('login_attempts')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    if (attempts && attempts.locked_until > Date.now()) {
      throw new ConvexError('Too many failed attempts. Try again in a few minutes.');
    }

    const valid = await verifyPassword(args.password, credential.password_hash, credential.password_salt);
    if (!valid) {
      const failed = (attempts?.failed_count ?? 0) + 1;
      const locked_until = failed >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
      if (attempts) {
        await ctx.db.patch(attempts._id, { failed_count: locked_until ? 0 : failed, locked_until });
      } else {
        await ctx.db.insert('login_attempts', { email, failed_count: failed, locked_until });
      }
      throw new ConvexError(genericError);
    }

    if (attempts) await ctx.db.delete(attempts._id);
    const token = await createSession(ctx, credential.profile_id);
    return { token };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await deleteSession(ctx, args.token);
    return { ok: true };
  },
});

/** Validates a stored token on boot so the UI knows whether to show the login screen. */
export const me = query({
  args: { token: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const profile = await getSessionProfile(ctx, args.token);
    if (!profile) return null;
    return {
      id: profile._id,
      full_name: profile.full_name,
      email: profile.email,
      business_name: profile.business_name,
      created_at: profile.created_at,
    };
  },
});

export const updateProfile = mutation({
  args: { token: v.string(), full_name: v.string(), business_name: v.string() },
  handler: async (ctx, args) => {
    const profile = await requireManager(ctx, args.token);
    const full_name = args.full_name.trim();
    const business_name = args.business_name.trim();
    if (full_name.length < LIMITS.fullName.min) throw new ConvexError('Enter your full name.');
    if (business_name.length < LIMITS.businessName.min) throw new ConvexError('Enter your studio or agency name.');
    await ctx.db.patch(profile._id, { full_name, business_name });
    return { ok: true };
  },
});

export const changePassword = mutation({
  args: { token: v.string(), current_password: v.string(), new_password: v.string() },
  handler: async (ctx, args) => {
    const profile = await requireManager(ctx, args.token);
    if (args.new_password.length < LIMITS.password.min) throw new ConvexError('Use at least 8 characters for your new password.');

    const credential = await ctx.db
      .query('credentials')
      .withIndex('by_email', (q) => q.eq('email', profile.email))
      .unique();
    if (!credential) throw new ConvexError('Account credentials are missing.');

    const valid = await verifyPassword(args.current_password, credential.password_hash, credential.password_salt);
    if (!valid) throw new ConvexError('Your current password is incorrect.');

    const { hash, salt } = await hashPassword(args.new_password);
    await ctx.db.patch(credential._id, { password_hash: hash, password_salt: salt });

    // Drop every other session: a password change should not leave old devices signed in.
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_profile', (q) => q.eq('profile_id', profile._id))
      .collect();
    for (const session of sessions) {
      const isCurrent = session.token_hash === (await currentHash(args.token));
      if (!isCurrent) await ctx.db.delete(session._id);
    }
    return { ok: true };
  },
});

async function currentHash(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deletes the account and everything it owns (PRD section 8: provide a process for
 * deleting accounts and associated data). Client rows cascade to posts, feedback and logs.
 */
export const deleteAccount = mutation({
  args: { token: v.string(), confirm_email: v.string() },
  handler: async (ctx, args) => {
    const profile = await requireManager(ctx, args.token);
    if (args.confirm_email.trim().toLowerCase() !== profile.email) {
      throw new ConvexError('Type your email address exactly to confirm deletion.');
    }

    const posts = await ctx.db
      .query('posts')
      .withIndex('by_manager', (q) => q.eq('manager_id', profile._id))
      .collect();
    for (const post of posts) {
      const feedback = await ctx.db
        .query('feedback')
        .withIndex('by_post', (q) => q.eq('post_id', post._id))
        .collect();
      for (const entry of feedback) await ctx.db.delete(entry._id);
      await ctx.db.delete(post._id);
    }

    const logs = await ctx.db
      .query('activity_logs')
      .withIndex('by_manager_created', (q) => q.eq('manager_id', profile._id))
      .collect();
    for (const log of logs) await ctx.db.delete(log._id);

    const clients = await ctx.db
      .query('clients')
      .withIndex('by_manager', (q) => q.eq('manager_id', profile._id))
      .collect();
    for (const client of clients) await ctx.db.delete(client._id);

    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_profile', (q) => q.eq('profile_id', profile._id))
      .collect();
    for (const session of sessions) await ctx.db.delete(session._id);

    const credential = await ctx.db
      .query('credentials')
      .withIndex('by_email', (q) => q.eq('email', profile.email))
      .unique();
    if (credential) await ctx.db.delete(credential._id);

    await ctx.db.delete(profile._id);
    return { ok: true };
  },
});
