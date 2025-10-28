import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function ImagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-64 border-r border-white/10">
        {/* Sidebar simples de modelos */}
        <Sidebar />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
