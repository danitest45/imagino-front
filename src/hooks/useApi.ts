'use client';

import { useCallback } from 'react';
import { apiFetch } from '../lib/api-client';
import { AppError } from '../lib/errors';

export function useApi() {
  const base = process.env.NEXT_PUBLIC_API_URL || '';

  return useCallback(async (path: string, init: RequestInit = {}) => {
    const url = `${base}${path}`;
    try {
      return await apiFetch(url, init);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError({ status: 0, title: 'Network error' });
    }
  }, [base]);
}
