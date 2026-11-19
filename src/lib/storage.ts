import type { Database } from './types';

const STORAGE_KEY = 'approvalflow.db.v1';
const SCHEMA_VERSION = 1;

interface Envelope {
  version: number;
  savedAt: string;
  db: Database;
}

/**
 * Phase 1 keeps state in localStorage so the prototype survives a refresh.
 * Phase 2 replaces this module with the Supabase client; nothing else imports it directly
 * except the store, so the swap is contained.
 */
export function loadDatabase(): Database | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as Envelope;
    if (envelope.version !== SCHEMA_VERSION || !envelope.db) return null;
    return envelope.db;
  } catch {
    return null;
  }
}

export function saveDatabase(db: Database) {
  if (typeof window === 'undefined') return;
  try {
    const envelope: Envelope = { version: SCHEMA_VERSION, savedAt: new Date().toISOString(), db };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Storage can be full or blocked (private mode). The app keeps working in memory.
  }
}

export function clearDatabase() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
