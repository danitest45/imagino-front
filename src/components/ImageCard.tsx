'use client';
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { getPresignedDownloadUrl } from '../lib/api';

type Props = {
  src?: string;
  prompt?: string;
  loading?: boolean;
  onClick: () => void;
};

export default function ImageCard({ src, prompt = '', loading, onClick }: Props) {
  const [hovered, setHovered] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!src) return;
    try {
      const key = new URL(src).pathname.slice(1);
      const url = await getPresignedDownloadUrl(key, prompt);
      window.location.href = url;
    } catch (err) {
      console.error('Erro ao baixar imagem', err);
    }
  };

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden shadow-lg border border-gray-800 cursor-pointer group transform transition-all duration-300 hover:scale-105 animate-fade-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Imagem quando carregada */}
      {src && !loading && (
        <img src={src} alt="Imagem" className="w-full h-auto object-cover" />
      )}

      {/* Placeholder de carregamento */}
      {loading && (
        <div className="flex items-center justify-center w-full h-72 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Botão de download */}
      {hovered && src && !loading && (
        <button
          onClick={handleDownload}
          className="absolute top-2 right-2 z-10 bg-black/60 p-2 rounded-full text-white hover:bg-black/80 transition"
        >
          <Download size={18} />
        </button>
      )}
    </div>
  );
}
