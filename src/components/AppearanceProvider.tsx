"use client";

import { useEffect, type ReactNode } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { THEME_STORAGE_KEY, themePreference } from "../lib/theme";

function PreferenceGuard() {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    const preference = themePreference(theme);
    document.documentElement.dataset.themePreference = preference;
    // Includes malformed cross-tab storage events. Only a benign preference is
    // persisted; next-themes retains in-memory state if storage is unavailable.
    if (theme !== undefined && theme !== preference) setTheme(preference);
  }, [theme, setTheme]);
  useEffect(() => {
    const cleared = (event: StorageEvent) => {
      if (event.key === null) setTheme("system");
    };
    window.addEventListener("storage", cleared);
    return () => window.removeEventListener("storage", cleared);
  }, [setTheme]);
  return null;
}

export default function AppearanceProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" storageKey={THEME_STORAGE_KEY}
      defaultTheme="system" enableSystem enableColorScheme
      themes={["light", "dark"]} disableTransitionOnChange>
      <PreferenceGuard />
      {children}
    </ThemeProvider>
  );
}
