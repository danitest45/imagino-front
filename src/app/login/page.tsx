'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser } from '../../lib/api';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const auth = useContext(AuthContext);


  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!auth) return;
  try {
    const { token } = await loginUser(email, password);
    auth.login(token);
    router.push('/images/replicate');
  } catch (err: unknown) {
    setError('Erro ao entrar');
  }
};

  // Redireciona usuário para a tela de consentimento do Google
  const handleGoogleLogin = () => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
  const scope = 'openid email profile';
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri || '')}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&prompt=select_account`;
  window.location.href = authUrl;
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-8">
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-white mb-6">
          Entrar
        </h1>

        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none"
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none"
            required
          />
          <button
            type="submit"
            className="w-full py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            Entrar
          </button>
        </form>

        <button
          onClick={handleGoogleLogin}
          className="mt-4 w-full py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold"
        >
          Entrar com Google
        </button>

        <p className="mt-4 text-center text-gray-400">
          Ainda não tem conta?{' '}
          <Link href="/register" className="text-purple-500 hover:underline">
            Registrar
          </Link>
        </p>
      </div>
    </div>
  );
}
