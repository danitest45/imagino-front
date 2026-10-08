/** Indexing needs an explicitly approved production origin. Preview stays private. */
export function publicSite(): URL | null {
  if (process.env.VERCEL_ENV !== 'production' || process.env.INDEX_PUBLIC_SITE !== 'true') return null;
  try {
    const url = new URL(process.env.PUBLIC_SITE_URL ?? '');
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash ||
        url.pathname !== '/' || url.hostname.endsWith('.vercel.app') || url.hostname === 'localhost') return null;
    return url;
  } catch { return null; }
}
