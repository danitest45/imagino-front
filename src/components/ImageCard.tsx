'use client';
import { useState } from 'react';
import { Download, Loader2, Maximize2 } from 'lucide-react';
import { downloadJob } from '../lib/download';

type Props = {
  src?: string;
  jobId?: string;
  loading?: boolean;
  onClick: () => void;
};

export default function ImageCard({ src, jobId, loading, onClick }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative w-full cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl shadow-purple-500/10 transition duration-300 hover:-translate-y-1 hover:border-fuchsia-400/40 hover:shadow-purple-500/30 animate-fade-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {src && !loading ? (
        <>
          <img src={src} alt="Generated image" className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
        </>
      ) : (
        <div className="relative flex h-48 items-center justify-center overflow-hidden sm:h-64 md:h-72">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
          <Loader2 className="relative z-10 h-8 w-8 animate-spin text-fuchsia-200" />
        </div>
      )}

      {src && !loading && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-4 pt-12 text-xs font-medium text-gray-200">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-wide">
            <SparklesIcon />
            Community spotlight
          </div>
          <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-[11px]">
            <Maximize2 className="h-3.5 w-3.5" />
            Enlarge
          </div>
        </div>
      )}

      {hovered && src && !loading && jobId && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            downloadJob(jobId);
          }}
          className="absolute right-3 top-3 z-10 flex items-center justify-center rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
        >
          <Download size={16} />
        </button>
      )}
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M10 1.5l1.4 3.8a1 1 0 00.6.6L15.8 7l-3.8 1.4a1 1 0 00-.6.6L10 12.8l-1.4-3.8a1 1 0 00-.6-.6L4.2 7l3.8-1.4a1 1 0 00.6-.6L10 1.5zM4.5 12.5l.9 2.4a.6.6 0 00.4.4l2.4.9-2.4.9a.6.6 0 00-.4.4l-.9 2.4-.9-2.4a.6.6 0 00-.4-.4l-2.4-.9 2.4-.9a.6.6 0 00.4-.4l.9-2.4zM15.5 12.5l.9 2.4a.6.6 0 00.4.4l2.4.9-2.4.9a.6.6 0 00-.4.4l-.9 2.4-.9-2.4a.6.6 0 00-.4-.4l-2.4-.9 2.4-.9a.6.6 0 00.4-.4l.9-2.4z"
        fill="currentColor"
      />
    </svg>
  );
}
