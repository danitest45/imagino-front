'use client';

import { useEffect, useState } from 'react';

export default function Billing() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(true), []);

  return (
    <div
      className={`${
        visible ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300 space-y-6`}
    >
      <section>
        <h2 className="text-xl font-semibold mb-2">Plano Atual</h2>
        <p className="text-sm text-gray-300">
          Você está no plano{' '}
          <span className="text-purple-400 font-medium">Free</span>.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-2">Histórico de Pagamentos</h3>
        <table className="w-full text-left text-sm bg-gray-900/40 rounded-lg overflow-hidden">
          <thead>
            <tr className="text-gray-400">
              <th className="py-2">Data</th>
              <th className="py-2">Plano</th>
              <th className="py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-700">
              <td className="py-2">01/01/2024</td>
              <td className="py-2">Pro</td>
              <td className="py-2">R$49</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

