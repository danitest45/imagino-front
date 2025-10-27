"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { usePublicImageModels } from '../../hooks/usePublicImageModels';

export default function ImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { models } = usePublicImageModels('public');
  const modelLinks = useMemo(() => models, [models]);

  return (
    <div className="-mt-20 pt-20 flex min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed top-16 inset-x-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <nav className="flex items-center gap-3 px-4 py-3 overflow-x-auto">
          {modelLinks.map(model => {
            const href = `/images/${model.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={model.slug}
                href={href}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold text-white shadow-lg transition ${
                  active
                    ? 'border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 shadow-purple-500/40'
                    : 'border-white/10 bg-black/50 hover:border-fuchsia-400/40'
                }`}
              >
                {model.displayName}
              </Link>
            );
          })}
          {modelLinks.length === 0 && (
            <span className="text-xs text-gray-400">No public models available.</span>
          )}
        </nav>
      </div>

      {/* Spacer to avoid overlap with fixed mobile nav */}
      <div className="lg:hidden h-10" />

      <main className="flex-1 p-0">{children}</main>
    </div>
  );
}
