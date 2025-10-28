'use client';

import { useEffect, useState } from 'react';
import { listImageModels } from '../lib/api';
import type { PublicImageModelSummary } from '../types/image-model';
import type { Problem } from '../lib/errors';

interface PublicImageModelsState {
  models: PublicImageModelSummary[];
  loading: boolean;
  error: Problem | Error | null;
}

function isProblem(value: unknown): value is Problem {
  return Boolean(value) && typeof value === 'object' && 'status' in (value as Record<string, unknown>);
}

export function usePublicImageModels(): PublicImageModelsState {
  const [state, setState] = useState<PublicImageModelsState>({ models: [], loading: true, error: null });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const models = await listImageModels();
        if (!active) return;
        setState({ models, loading: false, error: null });
      } catch (err) {
        if (!active) return;
        const error = isProblem(err) ? err : err instanceof Error ? err : new Error('Erro ao carregar modelos');
        setState({ models: [], loading: false, error });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
