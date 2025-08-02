'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';

type Props = {
  src?: string;
  loading?: boolean;
  onClick: () => void;
};

export default function ImageCard({ src, loading, onClick }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative w-full h-full min-h-[300px] rounded-xl overflow-hidden shadow-lg border border-gray-800 cursor-pointer group transform transition-transform duration-200 hover:scale-105"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Imagem quando carregada */}
      {src && !loading && (
        <img src={src} alt="Imagem" className="w-full h-full object-cover" />
      )}

      {/* Placeholder de carregamento */}
      {loading && (
        <div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground">
          Gerando imagem...
        </div>
      )}

      {/* Botão de download */}
      {hovered && src && !loading && (
        <a
          href={src}
          download={`imagem-${Date.now()}.png`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 z-10 bg-black/60 p-2 rounded-full text-white hover:bg-black/80 transition"
        >
          <Download size={18} />
        </a>
      )}
    </div>
  );
}
