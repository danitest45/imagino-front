export type AppLogoProps = {
  variant?: 'icon' | 'centered';
  showText?: boolean;
  className?: string;
};

export default function AppLogo({ variant = 'icon', showText, className }: AppLogoProps) {
  const shouldShowText = showText ?? variant === 'centered';

  if (variant === 'centered') {
    return (
      <div className={`flex flex-col items-center justify-center text-center gap-4${className ? ` ${className}` : ''}`}>
        <div className="rounded-3xl bg-white/5 p-5 shadow-lg shadow-purple-500/15 backdrop-blur">
          <img
            src="/brand/logo-symbol.png"
            alt="Imagino.AI logo"
            className="h-24 w-auto drop-shadow-[0_12px_30px_rgba(168,85,247,0.25)]"
          />
        </div>
        {shouldShowText && (
          <span className="text-2xl font-semibold tracking-tight text-white drop-shadow-sm">IMAGINO.AI</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-white${className ? ` ${className}` : ''}`}>
      <img
        src="/brand/logo-symbol.png"
        alt="Imagino.AI logo"
        className="h-6 w-auto drop-shadow-[0_6px_16px_rgba(168,85,247,0.25)]"
      />
      {shouldShowText && <span className="text-sm font-semibold tracking-tight text-white">IMAGINO.AI</span>}
    </div>
  );
}
