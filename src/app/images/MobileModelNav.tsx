'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getPublicImageModels } from '../../lib/api';
import type { PublicImageModelSummary } from '../../types/image-model';
import { fallbackModels } from './Sidebar';

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
        if (data.length > 0) {
          setModels(data);
        } else {
          setModels(fallbackModels);
        }
      } catch (error) {
        console.warn('Failed to fetch mobile image models', error);
        if (active) {
          setModels(fallbackModels);
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

  const items = loading && models.length === 0 ? fallbackModels : models;

  return (
    <nav className="flex items-center gap-3 overflow-x-auto px-4 py-4 no-scrollbar">
      {loading && models.length === 0
        ? fallbackModels.map(model => (
            <div
              key={`mobile-model-skeleton-${model.slug}`}
              className="h-10 w-28 flex-shrink-0 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))
        : items.map(model => {
            const isActive = activeSlug === model.slug;
            return (
              <Link
                key={model.slug}
                href={`/images/${model.slug}`}
                className={`inline-flex h-10 flex-shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
                  isActive
                    ? 'border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/20 text-white shadow-lg shadow-purple-500/30'
                    : 'border-white/10 bg-black/40 text-gray-200 hover:border-fuchsia-400/40 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="truncate">{model.displayName}</span>
              </Link>
            );
          })}
    </nav>
  );
}
