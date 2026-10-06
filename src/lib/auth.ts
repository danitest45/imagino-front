import { buildProblem } from './api-client';
import { apiUrl } from './config';

export let accessToken: string | null = null;
let authEpoch = 0;

export function setAccessToken(token: string | null) {
  accessToken = token;
  authEpoch += 1;
}

export function getAccessToken(): string | null {
  return accessToken;
}

let pendingRefresh: Promise<boolean> | null = null;
let pendingLogout: Promise<void> | null = null;

// Rotation consumes the old cookie once. Share concurrent refresh calls from the
// provider, OAuth return page and request retries.
export function refreshAccessToken(): Promise<boolean> {
  if (pendingLogout) return Promise.resolve(false);
  if (!pendingRefresh) {
    pendingRefresh = performRefresh().finally(() => { pendingRefresh = null; });
  }
  return pendingRefresh;
}

async function performRefresh(): Promise<boolean> {
  const epoch = authEpoch;
  try {
    const res = await fetch(apiUrl('/api/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { token: string };
    if (epoch !== authEpoch) return false;
    accessToken = data.token;
    return true;
  } catch {
    return false;
  }
}

type AuthRequestInit = RequestInit & { skipProblem?: boolean };

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: AuthRequestInit = {},
): Promise<Response> {
  const { skipProblem, ...restInit } = init;
  const epoch = authEpoch;
  const headers = new Headers(restInit.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  let res = await fetch(input, { ...restInit, headers, credentials: 'include' });
  if (epoch !== authEpoch) throw new Error('Your session changed. Please try again.');
  if (res.status === 401 && !restInit.signal?.aborted) {
    const refreshed = await refreshAccessToken();
    if (refreshed && epoch === authEpoch && !restInit.signal?.aborted) {
      const retryHeaders = new Headers(restInit.headers);
      if (accessToken) {
        retryHeaders.set('Authorization', `Bearer ${accessToken}`);
      }
      res = await fetch(input, {
        ...restInit,
        headers: retryHeaders,
        credentials: 'include',
      });
    }
  }
  if (epoch !== authEpoch) throw new Error('Your session changed. Please try again.');
  if (!res.ok && !skipProblem) {
    throw await buildProblem(res);
  }
  return res;
}

export function logoutRequest(): Promise<void> {
  if (!pendingLogout) {
    setAccessToken(null);
    pendingLogout = performLogout(pendingRefresh).finally(() => { pendingLogout = null; });
  }
  return pendingLogout;
}

async function performLogout(refreshToFinish: Promise<boolean> | null): Promise<void> {
  try {
    // A pending rotation can still set a cookie even when its JWT is discarded.
    // Revoke the resulting cookie after that response has finished.
    await refreshToFinish;
    await fetch(apiUrl('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    setAccessToken(null);
  }
}
