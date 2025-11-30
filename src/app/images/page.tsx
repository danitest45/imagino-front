'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPublicImageModels } from '../../lib/api';

export default function ImagesIndexPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolveDefaultModel() {
      try {
        const models = await getPublicImageModels();
        if (models.length === 0 || !models[0].slug) {
          throw new Error('No image models are available yet.');
        }

        const targetSlug = models[0].slug;

        if (!cancelled) {
          router.replace(`/images/${targetSlug}`);
        }
      } catch (error) {
        console.warn('Failed to resolve default image model', error);
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'We could not load the image models right now.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    resolveDefaultModel();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 text-center text-sm text-gray-200">
        <div className="max-w-md space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-fuchsia-500/20">
          <p className="text-base font-semibold text-white">Unable to load models</p>
          <p className="text-gray-300">{error}</p>
          <p className="text-xs text-gray-500">Please try again in a moment.</p>
        </div>
      </div>
    );
  }

  return null;
}
