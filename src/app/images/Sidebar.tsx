'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === `/images${path}`
      ? 'bg-purple-700 text-white'
      : 'text-gray-300 hover:bg-gray-800';

  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 p-6">
      <h2 className="text-lg text-white font-semibold mb-4">Modelos</h2>
      <nav className="space-y-2">
        <Link href="/images/runpod">
          <span className={`block px-4 py-2 rounded cursor-pointer ${isActive('/runpod')}`}>
            ⚡ RunPod
          </span>
        </Link>
        <Link href="/images/replicate">
          <span className={`block px-4 py-2 rounded cursor-pointer ${isActive('/replicate')}`}>
            ✨ Replicate
          </span>
        </Link>
      </nav>
    </aside>
  );
}
