import { ConvexError } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

/**
 * Server-side authentication.
 *
 * Passwords are hashed with PBKDF2-SHA256 (the Convex isolate provides WebCrypto but no
 * Argon2/bcrypt). Sessions are opaque 256-bit tokens: the browser keeps the raw token, the
 * database only ever stores its SHA-256 hash, so a database leak does not yield live sessions.
 */

const PBKDF2_ITERATIONS = 210_000;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function randomToken(bytes = 32) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toHex(digest);
}

async function derive(password: string, saltHex: string, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string) {
  const salt = randomToken(16);
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return { hash, salt };
}

/** Constant-time comparison so response timing does not leak hash prefixes. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password: string, hash: string, salt: string) {
  const candidate = await derive(password, salt, PBKDF2_ITERATIONS);
  return safeEqual(candidate, hash);
}

export async function createSession(ctx: MutationCtx, profileId: Id<'profiles'>) {
  const token = randomToken(32);
  const now = Date.now();
  await ctx.db.insert('sessions', {
    token_hash: await sha256(token),
    profile_id: profileId,
    created_at: now,
    expires_at: now + SESSION_TTL_MS,
  });
  return token;
}

/**
 * Resolves a bearer token to a profile. Returns null for unknown, malformed or expired
 * tokens — callers must treat all three identically.
 */
export async function getSessionProfile(ctx: QueryCtx | MutationCtx, token: string | null | undefined) {
  if (!token) return null;
  const tokenHash = await sha256(token);
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token_hash', (q) => q.eq('token_hash', tokenHash))
    .unique();
  if (!session) return null;
  if (session.expires_at < Date.now()) return null;

  const profile = await ctx.db.get(session.profile_id);
  if (!profile) return null;
  return profile;
}

/** Throws for unauthenticated calls, so mutations fail closed. */
export async function requireManager(ctx: QueryCtx | MutationCtx, token: string | null | undefined) {
  const profile = await getSessionProfile(ctx, token);
  if (!profile) {
    throw new ConvexError('Your session has expired. Please log in again.');
  }
  return profile;
}

export async function deleteSession(ctx: MutationCtx, token: string) {
  const tokenHash = await sha256(token);
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token_hash', (q) => q.eq('token_hash', tokenHash))
    .unique();
  if (session) await ctx.db.delete(session._id);
}
