'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '../../lib/api';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);

  const messages: Record<string, string> = {
    TOKEN_INVALID: 'Link inválido.',
    TOKEN_EXPIRED: 'Link expirado. Peça um novo link.',
    TOKEN_CONSUMED: 'Este link já foi usado.',
    WEAK_PASSWORD: 'Senha fraca. Use 8+ caracteres com número e símbolo.',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('As senhas não conferem');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setStatus('success');
    } catch (err: unknown) {
      const code = (err as Error).message;
      setError(messages[code] || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center text-white flex-col gap-4">
        <p>Senha redefinida com sucesso.</p>
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-purple-600 rounded-md"
        >
          Ir para login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 px-4 py-8">
      <form onSubmit={handleSubmit} className="bg-gray-800/80 p-8 rounded-xl shadow-2xl w-full max-w-md text-white space-y-4">
        <h1 className="text-2xl font-bold text-center mb-4">Redefinir senha</h1>
        {error && (
          <p className="text-red-500" aria-live="polite">
            {error}
          </p>
        )}
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Nova senha"
          className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400"
          required
        />
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Confirmar senha"
          className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-purple-600 font-semibold disabled:opacity-50"
        >
          {loading ? 'Enviando…' : 'Redefinir'}
        </button>
        <Link href="/login" className="block text-purple-400 underline text-center">
          Voltar para login
        </Link>
      </form>
    </div>
  );
}
