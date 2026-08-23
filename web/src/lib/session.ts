import { useAuthStore } from '@stores/auth';

/** Route the user signs in on. */
export const LOGIN_PATH = '/login';

/**
 * Whether a redirect target is safe to send the browser to.
 *
 * Only same-origin, single-slash paths qualify. `//evil.com` and
 * `https://evil.com` are both browser-valid navigation targets, so a `next`
 * parameter copied straight out of the URL is an open-redirect hole — the kind
 * used to make a phishing link look like it points at this app.
 */
export function isSafeRedirect(path: string | null | undefined): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

/**
 * Wipe the session from memory *and* from localStorage.
 *
 * The store's own `clearSession` only nulls the fields, and the persist
 * middleware faithfully writes those nulls back — leaving a `shopper.auth`
 * entry behind after sign-out. `clearStorage()` removes the key outright.
 *
 * Order matters: reset the state first, then drop the key. Reversed, the
 * state change would immediately re-persist the entry.
 */
export function clearStoredSession(): void {
  useAuthStore.getState().clearSession();
  useAuthStore.persist.clearStorage();
}

/**
 * Tear down the session and send the user to the login page.
 *
 * Called from the axios interceptors, which live outside React and have no
 * router access, so this navigates through the browser. The resulting full
 * reload is deliberate: it drops every scrap of in-memory state (react-query
 * caches included) that belonged to the dead session.
 */
export function endSession(): void {
  clearStoredSession();

  // Already on (or heading to) the login page — nothing to redirect.
  if (window.location.pathname.startsWith(LOGIN_PATH)) return;

  const next = `${window.location.pathname}${window.location.search}`;
  const target =
    isSafeRedirect(next) && next !== '/'
      ? `${LOGIN_PATH}?next=${encodeURIComponent(next)}`
      : LOGIN_PATH;

  window.location.assign(target);
}
