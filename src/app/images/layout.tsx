import Sidebar from './Sidebar';
import Link from 'next/link';


export default function ImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mt-20 pt-20 flex min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed top-16 inset-x-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <nav className="flex items-center gap-3 px-4 py-3 overflow-x-auto">
          <Link
            href="/images/replicate"
            className="inline-flex items-center gap-2 rounded-2xl border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30"
          >
            Replicate Studio
          </Link>
        </nav>
      </div>

      {/* Spacer to avoid overlap with fixed mobile nav */}
      <div className="lg:hidden h-10" />

      <main className="flex-1 p-0">{children}</main>
    </div>
  );
}
