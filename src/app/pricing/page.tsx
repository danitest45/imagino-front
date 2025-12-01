'use client';

import { useState } from 'react';
import { createCheckoutSession } from '../../lib/billing';

export default function PricingPage() {
  const [loading, setLoading] = useState<'PRO' | 'ULTRA' | null>(null);

  const handleSubscribe = async (plan: 'PRO' | 'ULTRA') => {
    try {
      setLoading(plan);
      const { url } = await createCheckoutSession(plan);
      window.location.href = url;
    } catch (err) {
      console.error(err);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-[100dvh] mt-16 md:mt-24 px-4 py-10 bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 text-gray-100 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-gray-400 text-lg">Select the perfect plan for your needs</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 justify-center items-center">
          <div className="bg-gray-900/40 p-6 rounded-xl w-full max-w-sm text-center hover:scale-105 transition-transform">
            <h2 className="text-2xl font-bold mb-2 text-purple-400">PRO</h2>
            <p className="text-3xl font-bold mb-2">US$10</p>
            <p className="text-gray-400 mb-6">per month</p>
            <ul className="text-left text-sm text-gray-300 mb-6 space-y-2">
              <li>• 100 credits per month</li>
              <li>• High quality images</li>
              <li>• Priority support</li>
              <li>• All features included</li>
            </ul>
            <button
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-semibold"
              onClick={() => handleSubscribe('PRO')}
              disabled={loading !== null}
            >
              {loading === 'PRO' ? 'Carregando...' : 'Assinar PRO'}
            </button>
          </div>
          
          <div className="bg-gray-900/40 p-6 rounded-xl w-full max-w-sm text-center hover:scale-105 transition-transform border-2 border-purple-500 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </div>
            <h2 className="text-2xl font-bold mb-2 text-purple-400">ULTRA</h2>
            <p className="text-3xl font-bold mb-2">US$20</p>
            <p className="text-gray-400 mb-6">per month</p>
            <ul className="text-left text-sm text-gray-300 mb-6 space-y-2">
              <li>• 300 credits per month</li>
              <li>• Ultra high quality images</li>
              <li>• Priority support</li>
              <li>• All features included</li>
              <li>• Advanced AI models</li>
            </ul>
            <button
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-semibold"
              onClick={() => handleSubscribe('ULTRA')}
              disabled={loading !== null}
            >
              {loading === 'ULTRA' ? 'Carregando...' : 'Assinar ULTRA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

