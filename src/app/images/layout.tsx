'use client';

import Sidebar from './Sidebar';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getReplicateModels } from '../../lib/api';

type ModelSummary = { id: string; title: string; description: string };

export default function ImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [models, setModels] = useState<ModelSummary[]>([]);

  useEffect(() => {
    getReplicateModels().then(setModels).catch(() => setModels([]));
  }, []);

  const navModels = models.length > 0
    ? models
    : [{ id: 'flux-dev', title: 'Replicate Studio', description: '' }];

  return (
    <div className="-mt-20 pt-20 flex min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed top-16 inset-x-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <nav className="flex items-center gap-3 px-4 py-3 overflow-x-auto">
          {navModels.map(model => {
            const href = `/images/${model.id}`;
            const active = pathname === href;
            return (
              <Link
                key={model.id}
                href={href}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 text-white shadow-lg shadow-purple-500/30'
                    : 'border-white/10 bg-black/40 text-gray-200 hover:border-fuchsia-400/40 hover:text-white'
                }`}
              >
                {model.title}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Spacer to avoid overlap with fixed mobile nav */}
      <div className="lg:hidden h-10" />

      <main className="flex-1 p-0">{children}</main>
    </div>
  );
}
