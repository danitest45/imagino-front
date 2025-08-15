'use client';
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

type Props = {
  src?: string;
  loading?: boolean;
  onClick: () => void;
};

export default function ImageCard({ src, loading, onClick }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative inline-block max-w-full max-h-[80vh] rounded-xl overflow-hidden shadow-lg border border-gray-800 cursor-pointer group transform transition-all duration-300 hover:scale-105 animate-fade-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Imagem quando carregada */}
      {src && !loading && (
        <img src={src} alt="Imagem" className="w-auto h-auto max-w-full max-h-[80vh] object-contain" />
      )}

      {/* Placeholder de carregamento */}
      {loading && (
        <div className="flex items-center justify-center w-72 h-72 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Botão de download */}
      {hovered && src && !loading && (
        <a
          href={src}
          download={`imagem-${Date.now()}.png`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="absolute top-2 right-2 z-10 bg-black/60 p-2 rounded-full text-white hover:bg-black/80 transition"
        >
          <Download size={18} />
        </a>
      )}
    </div>
  );
}
