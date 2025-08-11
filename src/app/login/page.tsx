'use client';

import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser } from '../../lib/api';
import { AuthContext } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-950 px-4 py-8">
      <div className="w-full max-w-md p-8 rounded-xl bg-gray-800/80 backdrop-blur-md shadow-2xl">
        <h1 className="text-2xl font-bold text-center text-white mb-6">Entrar</h1>

        {error && <p className="text-red-400 mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail
              data-testid="email-icon"
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-700/60 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div className="relative">
            <Lock
              data-testid="password-icon"
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full pl-10 pr-10 py-2 rounded-md bg-gray-700/60 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <button
              type="button"
              aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
          >
            Entrar
          </button>
        </form>

        <button
          onClick={handleGoogleLogin}
          className="mt-4 w-full py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
        >
          Entrar com Google
        </button>

        <p className="mt-4 text-center text-gray-400">
          Ainda não tem conta?{' '}
          <Link href="/register" className="text-purple-400 hover:underline">
            Registrar
          </Link>
        </p>
      </div>
    </div>
  );
}
