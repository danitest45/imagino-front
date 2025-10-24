import { buildProblem } from './api-client';
import { apiUrl } from './config';

export let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/api/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { token: string };
    setAccessToken(data.token);
    return true;
  } catch {
    return false;
  }
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  let res = await fetch(input, { ...init, headers, credentials: 'include' });
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryHeaders = new Headers(init.headers);
      if (accessToken) {
        retryHeaders.set('Authorization', `Bearer ${accessToken}`);
      }
      res = await fetch(input, {
        ...init,
        headers: retryHeaders,
        credentials: 'include',
      });
    }
  }
  if (!res.ok) {
    throw await buildProblem(res);
  }
  return res;
}

export async function logoutRequest(): Promise<void> {
  try {
    await fetch(apiUrl('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    setAccessToken(null);
  }
}
