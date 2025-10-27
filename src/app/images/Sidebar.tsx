'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { listImageModels } from '../../lib/api';
import type { PublicImageModelSummary } from '../../types/image';

function getBadgeLabel(visibility: PublicImageModelSummary['visibility']): string {
  if (visibility === 'Premium') return 'Premium';
  if (visibility === 'Internal') return 'Internal';
  return 'Public';
}

function getDescription(model: PublicImageModelSummary): string {
  const parts: string[] = [];
  if (model.capabilities.image) parts.push('Generation');
  if (model.capabilities.inpaint) parts.push('Inpainting');
  if (model.capabilities.upscale) parts.push('Upscaling');
  return parts.length > 0 ? parts.join(' • ') : 'Image creation model';
}

export default function Sidebar() {
  const pathname = usePathname();
  const [models, setModels] = useState<PublicImageModelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await listImageModels('public', ['defaultversion', 'presets']);
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
        {loading && models.length === 0 && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="h-28 rounded-3xl border border-white/10 bg-white/5 animate-pulse"
              />
            ))}
          </div>
        )}
        {models.map(model => {
          const active = pathname === `/images/${model.slug}`;
          const badge = getBadgeLabel(model.visibility);
          return (
            <Link
              key={model.slug}
              href={`/images/${model.slug}`}
              className={`group relative block overflow-hidden rounded-3xl border px-5 py-5 transition ${
                active
                  ? 'border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 via-purple-500/20 to-cyan-400/20 shadow-lg shadow-purple-500/40'
                  : 'border-white/10 bg-black/40 hover:border-fuchsia-400/40 hover:bg-black/50'
              }`}
            >
              <div className="absolute -top-6 right-6 h-20 w-20 rounded-full bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-cyan-400/20 blur-2xl" aria-hidden />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-200">
                    <Sparkles className="h-3.5 w-3.5" /> {badge}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-white">{model.displayName}</h3>
                  <p className="mt-2 text-sm text-gray-400">{getDescription(model)}</p>
                </div>
                <span
                  className={`mt-1 inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.3em] ${
                    active ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 text-gray-400'
                  }`}
                >
                  {active ? 'Active' : 'Explore'}
                </span>
              </div>
            </Link>
          );
        })}
        {!loading && models.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-black/40 px-4 py-6 text-sm text-gray-400">
            No public models available at the moment.
          </div>
        )}
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
