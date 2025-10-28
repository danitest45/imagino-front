'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPublicImageModels } from '../../lib/api';
import type { PublicImageModelSummary } from '../../types/image-model';

const fallbackModels: PublicImageModelSummary[] = [
  {
    slug: 'replicate',
    displayName: 'Replicate Studio',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [models, setModels] = useState<PublicImageModelSummary[]>(fallbackModels);

  useEffect(() => {
    let active = true;

    async function loadModels() {
      try {
        const data = await getPublicImageModels();
        if (!active || data.length === 0) return;
        setModels(data);
      } catch (error) {
        console.error('Failed to fetch image models', error);
      }
    }

    loadModels();

    return () => {
      active = false;
    };
  }, []);

  return (
    <aside className="sticky top-24 flex h-[calc(100vh-6rem)] w-72 flex-col gap-8 rounded-r-[40px] border border-white/5 border-l-transparent bg-black/30 px-6 py-8 text-sm text-gray-200 shadow-[0_30px_80px_-40px_rgba(168,85,247,0.45)] backdrop-blur-xl">
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
        {models.map(model => {
          const href = `/images/${model.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={model.slug}
              href={href}
              className={`group relative block overflow-hidden rounded-3xl border px-5 py-5 transition ${
                active
                  ? 'border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 via-purple-500/20 to-cyan-400/20 shadow-lg shadow-purple-500/40'
                  : 'border-white/10 bg-black/40 hover:border-fuchsia-400/40 hover:bg-black/50'
              }`}
            >
              <div className="relative flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">{model.displayName}</h3>
                <span
                  className={`inline-flex h-3 w-3 shrink-0 rounded-full ${
                    active ? 'bg-fuchsia-400' : 'bg-white/30'
                  }`}
                  aria-hidden
                />
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 rounded-3xl border border-white/10 bg-black/40 p-5 text-xs text-gray-400">
        <p className="text-[11px] uppercase tracking-[0.35em] text-fuchsia-200">Need more models?</p>
        <p className="leading-relaxed text-sm text-gray-300">
          Additional providers are coming soon. Tell us what you&apos;d like to see next at support@imagino.ai.
        </p>
      </div>
    </aside>
  );
}
