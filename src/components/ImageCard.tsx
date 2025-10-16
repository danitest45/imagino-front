'use client';
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
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
      className="relative w-full rounded-xl overflow-hidden shadow-lg border border-gray-800 cursor-pointer group transform transition-all duration-300 hover:scale-105 animate-fade-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Image when loaded */}
      {src && !loading && (
        <img src={src} alt="Image" className="w-full h-auto object-cover" />
      )}

      {/* Loading placeholder */}
      {loading && (
        <div className="flex items-center justify-center w-full h-48 sm:h-64 md:h-72 text-muted-foreground">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
        </div>
      )}

      {/* Download button */}
        {hovered && src && !loading && jobId && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              downloadJob(jobId);
            }}
            className="absolute top-2 right-2 z-10 bg-black/60 p-1.5 sm:p-2 rounded-full text-white hover:bg-black/80 transition"
          >
            <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        )}
    </div>
  );
}
