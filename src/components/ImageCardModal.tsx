'use client';

import { useEffect, useRef } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  prompt: string;
};

export default function ImageCardModal({ isOpen, onClose, src, prompt }: Props) {
  const modalRef = useRef<HTMLDivElement>(null); // ✅ Agora está no lugar certo

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
      <div
        ref={modalRef}
        className="bg-gray-900 rounded-xl p-6 w-full max-w-3xl shadow-2xl relative"
      >
        <img
          src={src}
          alt="Imagem completa"
          className="w-full h-auto rounded-md mb-4"
        />
        <p className="text-gray-300 text-sm whitespace-pre-line break-words">{prompt}</p>
      </div>
    </div>
  );
}
