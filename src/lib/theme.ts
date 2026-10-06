export const THEME_STORAGE_KEY = "imagino-theme";
export type ThemePreference = "system" | "light" | "dark";
export function themePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

// First-party, fixed source: runs synchronously before paint. No user data is
// interpolated. Storage failure never prevents system resolution. next-themes
// owns reactive updates; this also validates its persisted input before hydration.
export const THEME_BOOTSTRAP = `(function(){var p='system';try{var s=localStorage.getItem('imagino-theme');if(s==='light'||s==='dark'||s==='system')p=s;else if(s!==null)localStorage.setItem('imagino-theme','system')}catch(e){}var dark=false;try{dark=window.matchMedia('(prefers-color-scheme: dark)').matches}catch(e){}var r=p==='system'?(dark?'dark':'light'):p;var h=document.documentElement;h.setAttribute('data-theme',r);h.setAttribute('data-theme-preference',p);h.style.colorScheme=r})()`;
