'use client';

import { useState } from 'react';
import { forgotPassword } from '../../lib/api';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <p>Se um usuário existir, enviamos um email com instruções.</p>
          <Link href="/login" className="text-purple-400 underline">
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 px-4 py-8">
      <form onSubmit={handleSubmit} className="bg-gray-800/80 p-8 rounded-xl shadow-2xl w-full max-w-md text-white space-y-4">
        <h1 className="text-2xl font-bold text-center mb-4">Esqueci minha senha</h1>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-purple-600 font-semibold disabled:opacity-50"
        >
          {loading ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
