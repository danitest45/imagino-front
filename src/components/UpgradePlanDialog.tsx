'use client';
import Link from 'next/link';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function UpgradePlanDialog({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-gray-800 p-6 rounded-xl max-w-sm w-full text-center">
        <h2 className="text-lg font-semibold text-white mb-2">Recurso disponível em plano superior</h2>
        <p className="text-gray-300 text-sm mb-4">
          Faça upgrade para desbloquear este recurso.
        </p>
        <div className="flex gap-2 justify-center">
          <Link
            href="/pricing"
            className="px-4 py-2 bg-purple-600 rounded text-white hover:bg-purple-500"
          >
            Ver planos
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded text-white hover:bg-gray-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
