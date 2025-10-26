'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';

const models = [
  {
    id: 'replicate',
    href: '/images/replicate',
    title: 'Flux 1.1 Pro',
    description: 'Modelo difusor calibrado para renders de marketing.',
    badge: 'Premium',
  },
  {
    id: 'seedream-4',
    href: '/images/seedream-4',
    title: 'Seedream 4',
    description: 'Gera imagens 2K de alta qualidade com 4:3.',
    badge: 'Novo',
  },
];

export default function Sidebar() {
  const pathname = usePathname();

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
          const active = pathname === model.href;
          return (
            <Link
              key={model.id}
              href={model.href}
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
                    <Sparkles className="h-3.5 w-3.5" /> {model.badge}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-white">{model.title}</h3>
                  <p className="mt-2 text-sm text-gray-400">{model.description}</p>
                </div>
                <span
                  className={`mt-1 inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.3em] ${
                    active ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 text-gray-400'
                  }`}
                >
                  Active
                </span>
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
