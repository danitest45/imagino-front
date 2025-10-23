'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthContext } from '../context/AuthContext';
import { getUserById, getUserId, getCredits } from '../lib/api';
import type { UserDto } from '../types/user';

const navLinks = [
  { href: '/images/replicate', label: 'Images' },
  { href: '/voices', label: 'Voices' },
  { href: '/videos', label: 'Videos' },
  { href: '/pricing', label: 'Pricing' },
];

export default function Navbar() {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<UserDto | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

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

  useEffect(() => {
    async function loadCredits() {
      if (!token) return;
      try {
        const c = await getCredits();
        setCredits(c);
      } catch (err) {
        console.error(err);
      }
    }
    loadCredits();
    const handler = () => loadCredits();
    window.addEventListener('creditsUpdated', handler);
    return () => window.removeEventListener('creditsUpdated', handler);
  }, [token]);

  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  if (!auth) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/'); // Redirect to home after logout
    setMobileOpen(false);
    setProfileOpen(false);
  };

  const avatarLetter = (user?.username || user?.email || 'U')
    .charAt(0)
    .toUpperCase();

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/5">
      <div className="relative mx-auto flex h-16 md:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="relative flex items-center text-lg sm:text-xl font-semibold text-white tracking-tight"
            aria-label="imagino.AI home"
          >
            <span className="mr-1 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-2 py-1 text-xs font-bold uppercase text-white shadow-lg shadow-purple-500/30">
              imagino.AI
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-2 rounded-full bg-white/5 px-1 py-1 text-sm text-gray-300 shadow-inner shadow-white/5">
            {navLinks.map(link => {
              const isActive = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 text-white shadow-lg shadow-purple-500/30'
                      : 'hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center justify-center rounded-full p-2 text-gray-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 lg:hidden"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Open navigation menu"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          {!isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/pricing"
                className="rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-gray-100 transition hover:bg-white/10"
              >
                View pricing
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                Credits
                <strong className="text-white">{credits ?? '--'}</strong>
              </span>
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(o => !o)}
                  className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500/80 via-purple-500/80 to-cyan-400/80 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:scale-[1.02]"
                >
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    avatarLetter
                  )}
                  <span className="absolute inset-0 rounded-full border border-white/20 opacity-0 transition group-hover:opacity-100" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border border-white/10 bg-gray-950/95 shadow-xl shadow-purple-500/10 backdrop-blur-lg">
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{user?.username ?? 'Account'}</p>
                      <p className="text-xs text-gray-400">{user?.email}</p>
                    </div>
                    <div className="border-t border-white/5" />
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-3 text-sm text-gray-200 transition hover:bg-white/5"
                    >
                      My profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                    >
                      Sign out
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 20h4a2 2 0 002-2v-1" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7V6a2 2 0 00-2-2H7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile navigation */}
      <div
        className={`lg:hidden transition-[max-height] duration-500 ease-in-out ${
          mobileOpen ? 'max-h-[100vh]' : 'max-h-0'
        } overflow-hidden border-t border-white/5 bg-black/70 backdrop-blur-xl`}
      >
        <nav className="space-y-1 px-4 py-6">
          {navLinks.map(link => {
            const isActive = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="mt-6 grid gap-3">
            {!isAuthenticated ? (
              <>
                <Link
                  href="/login"
                  className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="flex items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50"
                  onClick={() => setMobileOpen(false)}
                >
                  Create account
                </Link>
              </>
            ) : (
              <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Credits</p>
                  <p className="text-lg font-semibold text-white">{credits ?? '--'}</p>
                </div>
                <Link
                  href="/profile"
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-200 transition hover:bg-white/10"
                  onClick={() => setMobileOpen(false)}
                >
                  My profile
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center justify-center rounded-xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/25"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
