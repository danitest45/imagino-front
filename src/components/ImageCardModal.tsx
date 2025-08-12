'use client';

import React from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  prompt: string;
};

export default function ImageCardModal({ isOpen, onClose, src, prompt }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={onClose}>
      <div className="flex-1 flex items-center justify-center overflow-auto" onClick={e => e.stopPropagation()}>
        <img src={src} alt="Imagem completa" className="max-w-full max-h-full object-contain" />
      </div>
      <div
        className="p-4 text-gray-300 text-sm border-t border-gray-700 overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        {prompt}
      </div>
    </div>
  );
}
