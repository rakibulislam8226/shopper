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
 * Tear down the session and send the user to the login page.
 *
 * Called from the axios interceptors, which live outside React and have no
 * router access, so this navigates through the browser. The resulting full
 * reload is deliberate: it drops every scrap of in-memory state (react-query
 * caches included) that belonged to the dead session.
 */
export function endSession(): void {
  useAuthStore.getState().clearSession();

  // Already on (or heading to) the login page — nothing to redirect.
  if (window.location.pathname.startsWith(LOGIN_PATH)) return;

  const next = `${window.location.pathname}${window.location.search}`;
  const target =
    isSafeRedirect(next) && next !== '/'
      ? `${LOGIN_PATH}?next=${encodeURIComponent(next)}`
      : LOGIN_PATH;

  window.location.assign(target);
}
