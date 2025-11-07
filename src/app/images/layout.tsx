import Sidebar from './Sidebar';
import MobileModelNav from './MobileModelNav';


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
      <div className="lg:hidden fixed top-16 inset-x-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <MobileModelNav />
      </div>

      {/* Spacer to avoid overlap with fixed mobile nav */}
      <div className="lg:hidden h-20" />

      <main className="flex-1 p-0">{children}</main>
    </div>
  );
}
