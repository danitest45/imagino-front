'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="w-full bg-gray-900 border-b border-gray-800 shadow-sm fixed top-0 z-50">
      <div className="w-full px-6 py-4 flex items-center justify-between">

        {/* Esquerda: Logo + Abas */}
        <div className="flex items-center space-x-8">
          {/* Logo */}
          <Link href="/" className="text-white text-2xl font-bold">
            Imagino<span className="text-purple-500">.AI</span>
          </Link>

          {/* Abas */}
          <nav className="flex space-x-6 text-white text-sm sm:text-base">
            <Link href="/images" className="hover:text-purple-400 transition">Images</Link>
            <Link href="/voices" className="hover:text-purple-400 transition">Voz</Link>
            <Link href="/videos" className="hover:text-purple-400 transition">Vídeo</Link>
          </nav>
        </div>

        {/* Botão de login */}
        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
          Entrar
        </button>
      </div>
    </header>
  );
}
