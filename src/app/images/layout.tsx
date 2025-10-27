'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { listImageModels } from '../../lib/api';
import type { PublicImageModelSummary } from '../../types/image';

const defaultInclude = ['defaultversion', 'presets'] as const;

function getBadge(visibility: PublicImageModelSummary['visibility']): string | null {
  if (visibility === 'Premium') return 'Premium';
  if (visibility === 'Internal') return 'Internal';
  return null;
}

export default function ImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [models, setModels] = useState<PublicImageModelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await listImageModels('public', [...defaultInclude]);
        if (!cancelled) {
          setModels(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="-mt-20 pt-20 flex min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed top-16 inset-x-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <nav className="flex items-center gap-3 px-4 py-3 overflow-x-auto">
          {loading && models.length === 0 && (
            <>
              {Array.from({ length: 2 }).map((_, idx) => (
                <div
                  key={`model-skeleton-${idx}`}
                  className="h-9 w-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                />
              ))}
            </>
          )}
          {models.map(model => {
            const href = `/images/${model.slug}`;
            const active = pathname === href;
            const badge = getBadge(model.visibility);
            return (
              <Link
                key={model.slug}
                href={href}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-lg transition ${
                  active
                    ? 'border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 text-white shadow-purple-500/30'
                    : 'border-white/10 bg-black/40 text-gray-200 hover:border-fuchsia-400/40 hover:text-white'
                }`}
              >
                <span>{model.displayName}</span>
                {badge && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-white/80">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
          {!loading && models.length === 0 && (
            <span className="text-xs text-gray-400">No public models available</span>
          )}
        </nav>
      </div>

      {/* Spacer to avoid overlap with fixed mobile nav */}
      <div className="lg:hidden h-10" />

      <main className="flex-1 p-0">{children}</main>
    </div>
  );
}
