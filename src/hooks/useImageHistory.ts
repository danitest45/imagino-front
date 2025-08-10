// hooks/useImageJobs.ts

import { useEffect, useState } from 'react';
import { getUserHistory } from '../lib/api';
import type { ImageJobApi } from '../types/image-job';
import { useAuth } from '../context/AuthContext';

export function useImageHistory() {
  const { token } = useAuth();
  const [history, setHistory] = useState<ImageJobApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const hist = await getUserHistory(token);
        setHistory(hist);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  return { history, setHistory, loading };
}
