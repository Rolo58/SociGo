const SESSION_KEY = 'approvalflow.session.v1';

/**
 * The raw session token is the only thing kept in the browser. It is an opaque bearer
 * credential, never a user id, so nothing here can be edited to impersonate another manager.
 */
export function loadSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSessionToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_KEY, token);
  } catch {
    // Private mode: the session then lasts only for this tab.
  }
}

export function clearSessionToken() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
