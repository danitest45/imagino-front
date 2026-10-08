"use client";
import { AuthContext, AuthProvider } from "../context/AuthContext";
import { usePathname } from "next/navigation";
import { Toaster } from "../lib/toast";
import AppearanceProvider from "./AppearanceProvider";
import { useEffect } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => { try { localStorage.removeItem('image-jobs'); localStorage.removeItem('userEmail'); } catch { /* storage may be disabled */ } }, []);
  return <AppearanceProvider><SessionProviders>{children}</SessionProviders></AppearanceProvider>;
}

function SessionProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The review surface never restores a session or makes authentication requests.
  if (pathname === "/design-review")
    return (
      <AuthContext.Provider
        value={{
          token: null,
          isAuthenticated: false,
          login: () => {},
          logout: async () => {},
        }}
      >
        {children}
        <Toaster />
      </AuthContext.Provider>
    );
  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}
