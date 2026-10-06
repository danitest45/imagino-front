"use client";
import { AuthContext, AuthProvider } from "../context/AuthContext";
import { usePathname } from "next/navigation";
import { Toaster } from "../lib/toast";

export default function Providers({ children }: { children: React.ReactNode }) {
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
