'use client';

import React from 'react';

interface Props {
  open: boolean;
  current?: number;
  needed?: number;
  onClose: () => void;
  onUpgrade?: () => void;
}

export default function OutOfCreditsDialog({
  open,
  current,
  needed,
  onClose,
  onUpgrade,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-white text-black p-4 rounded">
        <h2 className="text-lg font-bold mb-2">Sem créditos</h2>
        <p className="mb-4">
          Saldo atual: {current ?? 0}. Necessário: {needed ?? 0}.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onUpgrade}
            className="bg-purple-600 text-white px-3 py-1 rounded"
          >
            Comprar créditos
          </button>
          <button onClick={onClose} className="px-3 py-1">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
