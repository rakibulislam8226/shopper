import { type RefreshData } from '@api/auth';
import { type ApiResponse } from '@api/types';
import { isExpired } from '@lib/jwt';
import { endSession } from '@lib/session';
import { useAuthStore } from '@stores/auth';
import Axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

/**
 * Keeps requests authenticated without the user ever noticing.
 *
 * Two layers, in this order:
 *
 * 1. Before a request goes out, if the stored access token has passed its
 *    `exp`, it is exchanged for a fresh pair first. This is the normal path —
 *    the expired token is never sent, so there is no wasted round trip and no
 *    interruption.
 * 2. If a 401 comes back anyway (clock skew, a token revoked server-side, a
 *    secret rotated), the response is refreshed-and-replayed once.
 *
 * When the refresh token itself is dead, the session is torn down and the
 * browser goes to the login page. That is the only case the user ever sees.
 *
 * The refresh call goes out on a bare axios instance: running it through the
 * app instance would re-enter this interceptor on its own failure and recurse.
 */
const bareAxios = Axios.create({ baseURL: '/api', timeout: 15_000 });

/** Token-minting endpoints. A 401 here is a real failure, not a stale token. */
const AUTH_PATHS = ['/users/login', '/users/refresh'];

interface RetriableConfig extends InternalAxiosRequestConfig {
  /** Set once a request has already been replayed after a refresh. */
  _retried?: boolean;
}

/**
 * The in-flight refresh, if any. Concurrent callers share this one promise
 * rather than each firing their own — the backend rotates refresh tokens, so
 * a second concurrent call would present an already-consumed token, be
 * rejected, and sign the user out mid-session.
 */
let refreshInFlight: Promise<string | null> | null = null;

/** Exact path match, so an unrelated route ending in "/users/login" can't slip in. */
function isAuthPath(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split('?')[0]?.replace(/\/+$/, '') ?? '';
  return AUTH_PATHS.includes(path);
}

/**
 * Only same-origin requests get the Authorization header.
 *
 * The instance is configured with a relative `baseURL`, but a caller passing
 * an absolute URL would otherwise hand this app's bearer token to whatever
 * host it names. Relative URLs resolve against this origin and are always safe.
 */
function isSameOrigin(url: string | undefined): boolean {
  if (!url) return true;
  if (!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(url)) return true;
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Run the refresh exchange, updating the store. Resolves to the new access token. */
async function performRefresh(): Promise<string | null> {
  const { refreshToken, setTokens } = useAuthStore.getState();

  // No refresh token, or it is past its own expiry — nothing worth sending.
  if (!refreshToken || isExpired(refreshToken)) return null;

  try {
    const response = await bareAxios.post<ApiResponse<RefreshData>>('/users/refresh', {
      refresh_token: refreshToken,
    });
    const tokens = response.data.data?.tokens;
    if (!tokens) return null;

    setTokens(tokens);
    return tokens.access_token;
  } catch {
    // Expired, revoked, or already rotated. No detail is logged: the reason
    // is the server's business and a console dump of token state is a gift to
    // anyone reading the page over a user's shoulder.
    return null;
  }
}

/** Single-flight wrapper: parallel callers await the same refresh. */
function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Refresh, or end the session if the refresh token is spent. */
async function renewOrEndSession(): Promise<string | null> {
  const accessToken = await refreshAccessToken();
  if (!accessToken) endSession();
  return accessToken;
}

export function attachAuthPlugin(instance: AxiosInstance): void {
  instance.interceptors.request.use(async (config) => {
    if (isAuthPath(config.url) || !isSameOrigin(config.url)) return config;

    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return config;

    const token = isExpired(accessToken) ? await renewOrEndSession() : accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetriableConfig | undefined;

      const canRetry =
        error.response?.status === 401 &&
        config !== undefined &&
        !config._retried &&
        !isAuthPath(config.url) &&
        isSameOrigin(config.url) &&
        useAuthStore.getState().refreshToken !== null;

      if (!canRetry) return Promise.reject(error);

      const token = await renewOrEndSession();
      if (!token) return Promise.reject(error);

      config._retried = true;
      config.headers.Authorization = `Bearer ${token}`;
      return instance(config);
    },
  );
}
