import type { NextConfig } from "next";

// Fail the staging branch build before any browser bundle can target a fallback API.
if (process.env.VERCEL_GIT_COMMIT_REF === 'codex/imagino-ai-revival-v2' &&
    (process.env.VERCEL_ENV !== 'preview' ||
     process.env.NEXT_PUBLIC_API_URL !== 'https://imagino-api-ai-staging.onrender.com' ||
     process.env.MEDIA_ALLOWED_HOSTS !== 'pub-56f86851d1884a3b8e7a73f1624e4239.r2.dev')) {
  throw new Error('Generation revival requires the isolated staging Preview configuration.');
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

module.exports = {
  images: {
    domains: ['minha-imagem.com', 'placehold.co'],
  },
}
