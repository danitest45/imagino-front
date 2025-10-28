import Sidebar from './Sidebar';

export default function ImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mt-20 min-h-screen pt-20 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 lg:flex-row lg:gap-12">
        <Sidebar />
        <main className="flex-1 rounded-3xl border border-white/5 bg-black/30 p-6 shadow-[0_25px_80px_-45px_rgba(168,85,247,0.55)] backdrop-blur-xl lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
