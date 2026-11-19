import * as React from 'react';
import { createSeedDatabase, SAMPLE_MANAGER } from './seed';
import { loadDatabase, saveDatabase } from './storage';
import * as repo from './repository';
import type { Client, ClientInput, Database, Post, PostInput, PostStatus, Profile } from './types';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: 'success' | 'error' | 'info';
}

interface StoreValue {
  db: Database;
  manager: Profile;
  /** Phase 1 has no authentication: the prototype runs as the sample manager. */
  session: { role: 'manager'; managerId: string };
  clients: Client[];
  archivedClients: Client[];
  posts: Post[];
  toasts: Toast[];
  dismissToast: (id: string) => void;
  notify: (toast: Omit<Toast, 'id'>) => void;
  createClient: (input: ClientInput) => repo.Result<Client>;
  updateClient: (id: string, input: ClientInput) => repo.Result<Client>;
  archiveClient: (id: string) => repo.Result<Record<string, never>>;
  restoreClient: (id: string) => repo.Result<Record<string, never>>;
  rotateReviewToken: (id: string) => repo.Result<Client>;
  createPost: (input: PostInput, status?: Extract<PostStatus, 'draft' | 'pending_approval'>) => repo.Result<Post>;
  updatePost: (id: string, input: PostInput) => repo.Result<Post>;
  submitPost: (id: string) => repo.Result<Post>;
  duplicatePost: (id: string) => repo.Result<Post>;
  archivePost: (id: string) => repo.Result<Record<string, never>>;
  restorePost: (id: string) => repo.Result<Record<string, never>>;
  decideAsClient: (token: string, postId: string, input: repo.DecisionInput) => repo.Result<Post>;
  resetSampleData: () => void;
}

const StoreContext = React.createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = React.useState<Database>(() => loadDatabase() ?? createSeedDatabase());
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    saveDatabase(db);
  }, [db]);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const notify = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((current) => [...current, { ...toast, id }]);
  }, []);

  React.useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => setToasts((current) => current.slice(1)), 5000);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const managerId = SAMPLE_MANAGER.id;

  /** Persists the returned database and hands the caller only the payload it asked for. */
  const commit = React.useCallback(
    <T extends { db: Database }, R>(result: repo.Result<T>, pick: (payload: Omit<T, 'db'>) => R): repo.Result<R> => {
      if (!result.ok) return result;
      const { db: nextDb, ...payload } = result.data;
      setDb(nextDb);
      return { ok: true, data: pick(payload as Omit<T, 'db'>) };
    },
    [],
  );

  const value = React.useMemo<StoreValue>(() => {
    const manager = repo.getProfile(db, managerId) ?? SAMPLE_MANAGER;

    return {
      db,
      manager,
      session: { role: 'manager', managerId },
      clients: repo.listClients(db, managerId),
      archivedClients: repo.listClients(db, managerId, { includeArchived: true }).filter((c) => c.archived_at),
      posts: repo.listPosts(db, managerId),
      toasts,
      dismissToast,
      notify,

      createClient: (input) => commit(repo.createClient(db, managerId, input), (d) => d.client),
      updateClient: (id, input) => commit(repo.updateClient(db, managerId, id, input), (d) => d.client),
      archiveClient: (id) => commit(repo.archiveClient(db, managerId, id), () => ({})),
      restoreClient: (id) => commit(repo.restoreClient(db, managerId, id), () => ({})),
      rotateReviewToken: (id) => commit(repo.rotateReviewToken(db, managerId, id), (d) => d.client),

      createPost: (input, status = 'draft') => commit(repo.createPost(db, managerId, input, status), (d) => d.post),
      updatePost: (id, input) => commit(repo.updatePost(db, managerId, id, input), (d) => d.post),
      submitPost: (id) => commit(repo.submitPost(db, managerId, id), (d) => d.post),
      duplicatePost: (id) => commit(repo.duplicatePost(db, managerId, id), (d) => d.post),
      archivePost: (id) => commit(repo.archivePost(db, managerId, id), () => ({})),
      restorePost: (id) => commit(repo.restorePost(db, managerId, id), () => ({})),

      decideAsClient: (token, postId, input) => commit(repo.recordDecision(db, token, postId, input), (d) => d.post),

      resetSampleData: () => setDb(createSeedDatabase()),
    };
  }, [db, toasts, commit, dismissToast, notify]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = React.useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside <StoreProvider>.');
  return context;
}
