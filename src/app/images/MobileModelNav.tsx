'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePublicImageModels } from '../../hooks/usePublicImageModels';

function getBadgeLabel(visibility: string | undefined): string {
  return visibility?.toLowerCase() === 'public' ? 'Public' : 'Premium';
}

export default function MobileModelNav() {
  const pathname = usePathname();
  const { models, loading, error } = usePublicImageModels();

  return (
    <nav className="flex items-center gap-3 px-4 py-3 overflow-x-auto">
      {loading && <span className="text-xs text-gray-300">Carregando...</span>}
      {error && !loading && (
        <span className="text-xs text-rose-200">Falha ao carregar modelos</span>
      )}
      {!loading && !error && models.length === 0 && (
        <span className="text-xs text-gray-300">Nenhum modelo</span>
      )}
      {models.map(model => {
        const href = `/images/${model.slug.toLowerCase()}`;
        const active = pathname === href;
        return (
          <Link
            key={model.slug}
            href={href}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              active
                ? 'border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 text-white'
                : 'border-white/10 bg-black/40 text-gray-200'
            }`}
          >
            <span className="text-xs uppercase tracking-[0.3em] text-fuchsia-200">{getBadgeLabel(model.visibility)}</span>
            {model.displayName}
          </Link>
        );
      })}
    </nav>
  );
}
