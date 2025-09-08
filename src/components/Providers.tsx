'use client';
import { AuthProvider } from '../context/AuthContext';
import { Toaster } from '../lib/toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}
