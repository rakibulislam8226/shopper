/**
 * Minimal client-side JWT reading.
 *
 * THIS IS NOT VERIFICATION. The signature is never checked here — it cannot
 * be, since the browser has no access to the signing secret, and shipping one
 * would hand it to every visitor. The server is the only authority on whether
 * a token is valid; these helpers exist purely so the client can *schedule*
 * around a token's stated expiry instead of waiting for a guaranteed 401.
 *
 * Every failure path returns "expired". Failing closed means a malformed or
 * unreadable token triggers a refresh, and the server rejects it if it really
 * is bad — the opposite default would let a junk token through unchallenged.
 */

interface JwtClaims {
  exp?: number;
}

/** Decode the payload segment. Returns null for anything that isn't a readable JWT. */
function decodeClaims(token: string): JwtClaims | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as JwtClaims;
  } catch {
    return null;
  }
}

/**
 * True when the token is at or past its `exp`.
 *
 * `skewSeconds` treats a token as expired slightly early, which covers clock
 * drift between the browser and the server and avoids sending a token that
 * expires in flight.
 */
export function isExpired(token: string, skewSeconds = 30): boolean {
  const claims = decodeClaims(token);
  if (typeof claims?.exp !== 'number') return true;
  return Date.now() >= (claims.exp - skewSeconds) * 1000;
}
