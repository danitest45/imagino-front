'use client';

import React from 'react';

interface Props {
  open: boolean;
  feature?: string;
  requiredPlan?: string;
  onClose: () => void;
  onUpgrade?: () => void;
}

export default function UpgradePlanDialog({
  open,
  feature,
  requiredPlan,
  onClose,
  onUpgrade,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-white text-black p-4 rounded">
        <h2 className="text-lg font-bold mb-2">Recurso do plano {requiredPlan}</h2>
        <p className="mb-4">
          {feature ? `${feature} requer plano ${requiredPlan}` : 'Faça upgrade para acessar este recurso.'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onUpgrade}
            className="bg-purple-600 text-white px-3 py-1 rounded"
          >
            Fazer upgrade
          </button>
          <button onClick={onClose} className="px-3 py-1">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
