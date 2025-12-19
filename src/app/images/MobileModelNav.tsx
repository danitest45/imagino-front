'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getPublicImageModels } from '../../lib/api';
import type { PublicImageModelSummary } from '../../types/image-model';

export default function MobileModelNav() {
  const pathname = usePathname();
  const [models, setModels] = useState<PublicImageModelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadModels() {
      try {
        const data = await getPublicImageModels();
        if (!active) return;
        const orderedModels = [...data].reverse();
        setModels(orderedModels);
      } catch (error) {
        console.warn('Failed to fetch mobile image models', error);
        if (active) {
          setModels([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadModels();

    return () => {
      active = false;
    };
  }, []);

  const activeSlug = useMemo(() => {
    if (!pathname) return '';
    const [, first, maybeSlug] = pathname.split('/');
    if (first !== 'images') return '';
    return maybeSlug ?? '';
  }, [pathname]);

  const skeletonItems = Array.from({ length: 3 }).map((_, index) => (
    <div
      key={`mobile-model-skeleton-${index}`}
      className="h-10 w-32 flex-shrink-0 animate-pulse rounded-2xl border border-white/10 bg-gradient-to-r from-white/5 via-white/0 to-fuchsia-500/10"
    />
  ));

  return (
    <nav className="flex items-center gap-3 overflow-x-auto px-4 py-4 no-scrollbar">
      {loading && models.length === 0 && skeletonItems}

      {!loading && models.length === 0 && (
        <div className="rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs text-gray-300">
          No models available right now.
        </div>
      )}

      {!loading &&
        models.map(model => {
          const isActive = activeSlug === model.slug;
          return (
            <Link
              key={model.slug}
              href={`/images/${model.slug}`}
              className={`relative inline-flex h-11 flex-shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
                isActive
                  ? 'border-fuchsia-300/70 bg-gradient-to-r from-fuchsia-600/30 via-purple-500/25 to-cyan-400/25 text-white shadow-lg shadow-fuchsia-500/30'
                  : 'border-white/10 bg-gradient-to-r from-white/5 via-white/0 to-fuchsia-500/10 text-gray-100 hover:border-fuchsia-300/50 hover:text-white'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs uppercase tracking-wide ${
                  isActive
                    ? 'border-fuchsia-200/70 bg-white/10 text-white'
                    : 'border-white/10 bg-black/50 text-gray-200'
                }`}
              >
                {model.displayName.slice(0, 2)}
              </span>
              <div className="flex flex-col text-left leading-tight">
                <span className="truncate text-sm font-semibold">{model.displayName}</span>
                <span className="text-[10px] uppercase tracking-[0.28em] text-gray-400">{model.slug.replace(/-/g, ' ')}</span>
              </div>
            </Link>
          );
        })}
    </nav>
  );
}
