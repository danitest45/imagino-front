// hooks/useImageJobs.ts

import { useEffect, useState } from 'react';
import { getUserHistory } from '../lib/api';
import type { ImageJobApi } from '../types/image-job';
import type { Problem } from '../lib/errors';
import { toast } from '../lib/toast';
import { useAuth } from '../context/AuthContext';

export function useImageHistory() {
  const { token } = useAuth();
  const [history, setHistory] = useState<ImageJobApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const hist = await getUserHistory();
        setHistory(hist);
      } catch (e) {
        const problem = e as Problem | undefined;
        if (problem?.status === 500) {
          setHistory([]);
          const traceId = problem.traceId ? ` (${problem.traceId})` : '';
          toast(`Não foi possível carregar o histórico${traceId}.`);
        } else {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  return { history, setHistory, loading };
}
