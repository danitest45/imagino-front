'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getPublicImageModels } from '../../lib/api';

export default function ImagesIndexPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function resolveDefaultModel() {
      let targetSlug = 'replicate';

      try {
        const models = await getPublicImageModels();
        if (models.length > 0 && models[0].slug) {
          targetSlug = models[0].slug;
        }
      } catch (error) {
        console.warn('Failed to resolve default image model', error);
      }

      if (!cancelled) {
        router.replace(`/images/${targetSlug}`);
      }
    }

    resolveDefaultModel();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
