import { AppError, Problem } from './errors';

async function parseProblem(res: Response): Promise<Problem> {
  try {
    const data = await res.json();
    return { status: res.status, ...data } as Problem;
  } catch {
    return { status: res.status, title: res.statusText };
  }
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const config: RequestInit = { credentials: 'include', ...init };
  const res = await fetch(input, config);
  if (res.ok) return res;

  const problem = await parseProblem(res);

  if (problem.code === 'TOKEN_EXPIRED') {
    try {
      const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const retry = await fetch(input, config);
        if (retry.ok) return retry;
      }
    } catch {
      // ignore
    }
  }

  throw new AppError(problem);
}
