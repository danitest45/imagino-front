import Sidebar from './Sidebar';
import Link from 'next/link';


export default function ImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mt-20 pt-20 flex min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed top-16 inset-x-0 z-30 border-b border-gray-800 bg-gray-950/80 backdrop-blur">
        <nav className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
          <Link href="/images/replicate" className="px-3 py-1.5 rounded-lg text-sm bg-purple-700 text-white">
            Replicate
          </Link>
        </nav>
      </div>

      {/* Spacer to avoid overlap with fixed mobile nav */}
      <div className="lg:hidden h-10" />

      <main className="flex-1 p-0">{children}</main>
    </div>
  );
}
