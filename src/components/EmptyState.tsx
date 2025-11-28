import AppLogo from './AppLogo';

type EmptyStateProps = {
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
};

export default function EmptyState({ title, description, ctaLabel, onCtaClick }: EmptyStateProps) {
  return (
    <div className="flex w-full items-center justify-center py-16">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 px-8 py-10 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="mx-auto inline-flex items-center justify-center rounded-full bg-white/10 p-3">
          <AppLogo variant="icon" />
        </div>
        <h3 className="mt-6 text-2xl font-semibold leading-tight text-white">{title}</h3>
        {description && <p className="mt-3 text-sm text-gray-300">{description}</p>}
        {ctaLabel && onCtaClick && (
          <button
            type="button"
            onClick={onCtaClick}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:from-fuchsia-400 hover:via-purple-400 hover:to-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-500"
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}
