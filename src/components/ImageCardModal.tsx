'use client';

import React from 'react';
import { X, Share2, Download } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  prompt: string;
};

/**
 * Modal para exibir detalhes de uma imagem.
 * Nesta primeira versão os dados exibidos são mockados para fins de layout.
 */
export default function ImageCardModal({ isOpen, onClose, src, prompt }: Props) {
  if (!isOpen) return null;

  const mock = {
    user: 'deniserobert',
    date: 'April 02, 2024 8:45 PM',
    model: 'lcm-texas-v1',
    style: 'Realistic',
    resolution: '1024x1024',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 text-gray-100 max-w-6xl w-full h-full md:h-auto md:max-h-[90vh] rounded-lg overflow-hidden flex flex-col md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        {/* Imagem */}
        <div className="flex-1 bg-black flex items-center justify-center p-4">
          <img src={src} alt="Imagem completa" className="max-h-full max-w-full object-contain" />
        </div>

        {/* Informações */}
        <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-gray-800 p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-semibold">{mock.user}</p>
              <p className="text-xs text-gray-400">{mock.date}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-3">
            <button className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">
              <Share2 size={14} /> Share
            </button>
            <button className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">
              <Download size={14} /> Download
            </button>
          </div>

          <div className="text-sm space-y-1">
            <p>
              <span className="font-semibold">Model:</span> {mock.model}
            </p>
            <p>
              <span className="font-semibold">Style:</span> {mock.style}
            </p>
            <p>
              <span className="font-semibold">Resolution:</span> {mock.resolution}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-1">Prompt</h4>
            <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{prompt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
