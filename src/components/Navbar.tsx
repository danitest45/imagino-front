'use client';

import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthContext } from '../context/AuthContext';
import { getUserById, getUserId } from '../lib/api';
import type { UserDto } from '../types/user';

export default function Navbar() {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<UserDto | null>(null);

  const token = auth?.token ?? null;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const logout = auth?.logout ?? (async () => {});

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const id = await getUserId();
        const data = await getUserById(id);
        setUser(data);
      } catch (err) {
        console.error(err);
      }
    }
    load();
    const handler = () => load();
    window.addEventListener('userUpdated', handler);
    return () => window.removeEventListener('userUpdated', handler);
  }, [token]);

  if (!auth) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/'); // Redireciona para home após logout
    setMenuOpen(false);
  };

  const avatarLetter = (user?.username || user?.email || 'U')
    .charAt(0)
    .toUpperCase();

  return (
    <header className="w-full bg-gray-900 border-b border-gray-800 shadow-sm fixed top-0 z-50">
      <div className="w-full px-6 py-4 flex items-center justify-between">
        {/* Esquerda: Logo + Abas */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-white text-2xl font-bold">
            Imagino<span className="text-purple-500">.AI</span>
          </Link>
          <nav className="flex space-x-6 text-white text-sm sm:text-base">
            <Link href="/images/replicate" className="hover:text-purple-400 transition">Images</Link>
            <Link href="/voices" className="hover:text-purple-400 transition">Voz</Link>
            <Link href="/videos" className="hover:text-purple-400 transition">Vídeo</Link>
          </nav>
        </div>

        {/* Direita: Login ou Avatar */}
        {!isAuthenticated ? (
          <Link
            href="/login"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            Entrar
          </Link>
        ) : (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-600 text-white overflow-hidden"
            >
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                avatarLetter
              )}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-800 rounded-lg shadow-lg z-50">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-white hover:bg-gray-700"
                >
                  Perfil
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
