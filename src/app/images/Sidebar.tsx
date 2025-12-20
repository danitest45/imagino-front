'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPublicImageModels } from '../../lib/api';
import type { PublicImageModelSummary } from '../../types/image-model';

export default function Sidebar() {
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
        console.error('Failed to fetch image models', error);
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

  const skeletonItems = Array.from({ length: 3 }).map((_, index) => (
    <div
      key={`model-skeleton-${index}`}
      className="h-[104px] w-full animate-pulse rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-fuchsia-500/10"
    />
  ));

  return (
    <aside className="sticky top-24 flex h-[calc(100dvh-6rem)] w-72 flex-col gap-8 rounded-r-[40px] border border-white/5 border-l-transparent bg-black/30 px-6 py-8 text-sm text-gray-200 shadow-[0_30px_80px_-40px_rgba(168,85,247,0.45)] backdrop-blur-xl">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-fuchsia-200">
          imagino.AI
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Image engines</h2>
          <p className="mt-2 text-sm text-gray-400">
            Choose the model calibrated for cinematic storytelling and brand-ready renders.
          </p>
        </div>
      </div>

      <nav className="space-y-3">
        {loading
          ? skeletonItems
          : models.map((model, index) => {
              const href = `/images/${model.slug}`;
              const active = pathname === href;
              const isNewest = index === 0;
              return (
                <Link
                  key={model.slug}
                  href={href}
                  className={`group relative block overflow-hidden rounded-3xl border px-5 py-5 transition ${
                    active
                      ? 'border-fuchsia-300/70 bg-gradient-to-br from-fuchsia-600/30 via-purple-500/25 to-cyan-400/25 shadow-xl shadow-purple-500/40'
                      : 'border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-fuchsia-500/5 hover:border-fuchsia-300/50 hover:shadow-lg hover:shadow-fuchsia-500/20'
                  }`}
                >
                  <div className="pointer-events-none absolute -inset-1 -z-10 opacity-0 blur-2xl transition duration-300 group-hover:opacity-70" aria-hidden>
                    <div className="h-full w-full bg-gradient-to-r from-fuchsia-500/30 via-purple-500/20 to-cyan-400/25" />
                  </div>

                  {isNewest && (
                    <div className="pointer-events-none absolute right-4 -top-2 flex items-center" aria-hidden>
                      <span className="relative inline-flex items-center gap-1 overflow-hidden rounded-full border border-white/20 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white shadow-lg shadow-fuchsia-500/40">
                        <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
                        <span className="relative">New</span>
                      </span>
                    </div>
                  )}

                  <div className="relative flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-base font-semibold uppercase tracking-wide ${
                        active
                          ? 'border-fuchsia-200/60 bg-white/10 text-white shadow-inner shadow-fuchsia-500/40'
                          : 'border-white/10 bg-black/60 text-gray-200'
                      }`}
                    >
                      {model.displayName.slice(0, 2)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-base font-semibold text-white">{model.displayName}</h3>
                      <p className="text-xs uppercase tracking-[0.28em] text-gray-400">
                        {model.slug.replace(/-/g, ' ')}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}

        {!loading && models.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-gray-300">
            No models available right now.
          </div>
        )}
      </nav>

      <div className="mt-auto space-y-2 rounded-3xl border border-white/10 bg-black/40 p-5 text-xs text-gray-400">
        <p className="text-[11px] uppercase tracking-[0.35em] text-fuchsia-200">Need more models?</p>
        <p className="leading-relaxed text-sm text-gray-300">
          Additional providers are coming soon. Tell us what you&apos;d like to see next at support@imaginoai-app.com.
        </p>
      </div>
    </aside>
  );
}
