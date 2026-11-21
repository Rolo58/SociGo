import * as React from 'react';
import { useConvex, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '../../convex/_generated/api';
import { loadSessionToken, saveSessionToken, clearSessionToken } from './session';
import type { ActivityLog, Client, ClientInput, Database, Feedback, Post, PostInput, PostStatus, Profile } from './types';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: 'success' | 'error' | 'info';
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
const fail = <T,>(error: string): Result<T> => ({ ok: false, error });

/** Surfaces ConvexError messages; anything else stays generic so internals are not leaked. */
function toError(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object' && 'message' in data) return String((data as { message: unknown }).message);
  }
  return 'Something went wrong. Please try again.';
}

interface StoreValue {
  loading: boolean;
  authenticated: boolean;
  manager: Profile | null;
  /** Manager-scoped snapshot shaped like the Phase 1 database, so views stay declarative. */
  db: Database;
  session: { role: 'manager'; managerId: string };
  clients: Client[];
  archivedClients: Client[];
  posts: Post[];
  feedback: Feedback[];
  activity: ActivityLog[];
  toasts: Toast[];
  dismissToast: (id: string) => void;
  notify: (toast: Omit<Toast, 'id'>) => void;

  register: (input: { full_name: string; business_name: string; email: string; password: string }) => Promise<Result<null>>;
  login: (input: { email: string; password: string }) => Promise<Result<null>>;
  logout: () => Promise<void>;
  updateProfile: (input: { full_name: string; business_name: string }) => Promise<Result<null>>;
  changePassword: (input: { current_password: string; new_password: string }) => Promise<Result<null>>;
  deleteAccount: (confirmEmail: string) => Promise<Result<null>>;

  createClient: (input: ClientInput) => Promise<Result<Client>>;
  updateClient: (id: string, input: ClientInput) => Promise<Result<Client>>;
  archiveClient: (id: string) => Promise<Result<null>>;
  restoreClient: (id: string) => Promise<Result<null>>;
  rotateReviewToken: (id: string) => Promise<Result<Client>>;

  createPost: (input: PostInput, status?: Extract<PostStatus, 'draft' | 'pending_approval'>) => Promise<Result<Post>>;
  updatePost: (id: string, input: PostInput) => Promise<Result<Post>>;
  submitPost: (id: string) => Promise<Result<Post>>;
  duplicatePost: (id: string) => Promise<Result<Post>>;
  archivePost: (id: string) => Promise<Result<null>>;
  restorePost: (id: string) => Promise<Result<null>>;

  decideAsClient: (
    token: string,
    postId: string,
    input: { decision: 'approved' | 'changes_requested'; comments: string; expectedRevision: number },
  ) => Promise<Result<Post>>;
}

const StoreContext = React.createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const convex = useConvex();
  const [token, setToken] = React.useState<string | null>(() => loadSessionToken());
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const profile = useQuery(api.accounts.me, token ? { token } : 'skip');
  // Scoped queries reject unknown tokens, so wait for `me` to confirm the session first.
  const session = token && profile ? { token } : null;
  const clients = useQuery(api.clients.list, session ? { ...session, includeArchived: true } : 'skip');
  const posts = useQuery(api.posts.list, session ? { ...session, includeArchived: true } : 'skip');
  const feedback = useQuery(api.dashboard.feedback, session ?? 'skip');
  const activity = useQuery(api.dashboard.activity, session ?? 'skip');

  // A stored token the server no longer recognises must not leave the UI half signed in.
  React.useEffect(() => {
    if (token && profile === null) {
      clearSessionToken();
      setToken(null);
    }
  }, [token, profile]);

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

  const value = React.useMemo<StoreValue>(() => {
    const run = async <T,>(fn: () => Promise<T>): Promise<Result<T>> => {
      try {
        return ok(await fn());
      } catch (error) {
        return fail(toError(error));
      }
    };

    const requireToken = () => {
      if (!token) throw new ConvexError('Your session has expired. Please log in again.');
      return token;
    };

    const clientRows = (clients ?? []) as Client[];
    const postRows = (posts ?? []) as Post[];
    const managerRow = (profile as Profile | null | undefined) ?? null;

    const db: Database = {
      profiles: managerRow ? [managerRow] : [],
      clients: clientRows,
      posts: postRows,
      feedback: (feedback ?? []) as Feedback[],
      activity_logs: (activity ?? []) as ActivityLog[],
    };

    return {
      loading: token !== null && profile === undefined,
      authenticated: Boolean(token && profile),
      manager: managerRow,
      db,
      session: { role: 'manager', managerId: managerRow?.id ?? '' },
      clients: clientRows.filter((c) => c.archived_at === null),
      archivedClients: clientRows.filter((c) => c.archived_at !== null),
      posts: postRows.filter((p) => p.status !== 'archived'),
      feedback: (feedback ?? []) as Feedback[],
      activity: (activity ?? []) as ActivityLog[],
      toasts,
      dismissToast,
      notify,

      register: (input) =>
        run(async () => {
          const result = await convex.mutation(api.accounts.register, input);
          saveSessionToken(result.token);
          setToken(result.token);
          return null;
        }),

      login: (input) =>
        run(async () => {
          const result = await convex.mutation(api.accounts.login, input);
          saveSessionToken(result.token);
          setToken(result.token);
          return null;
        }),

      logout: async () => {
        const current = token;
        clearSessionToken();
        setToken(null);
        if (current) {
          try {
            await convex.mutation(api.accounts.logout, { token: current });
          } catch {
            // The local session is already gone; a failed revoke must not block sign-out.
          }
        }
      },

      updateProfile: (input) =>
        run(async () => {
          await convex.mutation(api.accounts.updateProfile, { token: requireToken(), ...input });
          return null;
        }),

      changePassword: (input) =>
        run(async () => {
          await convex.mutation(api.accounts.changePassword, { token: requireToken(), ...input });
          return null;
        }),

      deleteAccount: (confirmEmail) =>
        run(async () => {
          await convex.mutation(api.accounts.deleteAccount, { token: requireToken(), confirm_email: confirmEmail });
          clearSessionToken();
          setToken(null);
          return null;
        }),

      createClient: (input) => run(() => convex.mutation(api.clients.create, { token: requireToken(), input })),
      updateClient: (id, input) =>
        run(() => convex.mutation(api.clients.update, { token: requireToken(), clientId: id as never, input })),
      archiveClient: (id) =>
        run(async () => {
          await convex.mutation(api.clients.archive, { token: requireToken(), clientId: id as never });
          return null;
        }),
      restoreClient: (id) =>
        run(async () => {
          await convex.mutation(api.clients.restore, { token: requireToken(), clientId: id as never });
          return null;
        }),
      rotateReviewToken: (id) =>
        run(() => convex.mutation(api.clients.rotateToken, { token: requireToken(), clientId: id as never })),

      createPost: (input, status = 'draft') =>
        run(() =>
          convex.mutation(api.posts.create, {
            token: requireToken(),
            input: { ...input, client_id: input.client_id as never },
            submit: status === 'pending_approval',
          }),
        ),
      updatePost: (id, input) =>
        run(() =>
          convex.mutation(api.posts.update, {
            token: requireToken(),
            postId: id as never,
            input: { ...input, client_id: input.client_id as never },
          }),
        ),
      submitPost: (id) => run(() => convex.mutation(api.posts.submit, { token: requireToken(), postId: id as never })),
      duplicatePost: (id) => run(() => convex.mutation(api.posts.duplicate, { token: requireToken(), postId: id as never })),
      archivePost: (id) =>
        run(async () => {
          await convex.mutation(api.posts.archive, { token: requireToken(), postId: id as never });
          return null;
        }),
      restorePost: (id) =>
        run(async () => {
          await convex.mutation(api.posts.restore, { token: requireToken(), postId: id as never });
          return null;
        }),

      decideAsClient: (reviewToken, postId, input) =>
        run(async () => {
          const result = await convex.mutation(api.review.decide, {
            token: reviewToken,
            postId: postId as never,
            ...input,
          });
          return result.post as Post;
        }),
    };
  }, [clients, posts, feedback, activity, profile, token, toasts, convex, dismissToast, notify]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = React.useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside <StoreProvider>.');
  return context;
}
