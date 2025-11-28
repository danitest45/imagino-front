import AppLogo from './AppLogo';

export default function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-black to-slate-900 text-white">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <AppLogo variant="centered" />
        <p className="text-sm text-gray-300">Preparing your Imagino workspace...</p>
      </div>
    </div>
  );
}
