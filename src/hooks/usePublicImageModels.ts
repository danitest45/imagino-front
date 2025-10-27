import { useEffect, useMemo, useState } from 'react';
import { listImageModels } from '../lib/api';
import type { PublicImageModelSummary } from '../types/image';

const DEFAULT_IMAGE_MODEL_INCLUDE = ['defaultversion', 'presets'] as const;

export function usePublicImageModels(
  visibility: 'public' | 'premium' | 'internal' = 'public',
  include: ReadonlyArray<string> = DEFAULT_IMAGE_MODEL_INCLUDE,
) {
  const [models, setModels] = useState<PublicImageModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const includeList = useMemo(() => Array.from(include), [include]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        const data = await listImageModels(visibility, includeList);
        if (!ignore) {
          setModels(data);
        }
      } catch (err) {
        console.error('Failed to load image models', err);
        if (!ignore) {
          setModels([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [visibility, includeList]);

  return { models, loading };
}
