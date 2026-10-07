import type { MetadataRoute } from 'next';
import { publicSite } from '../lib/public-site';
export default function robots(): MetadataRoute.Robots {
  const site = publicSite();
  return site ? { rules: { userAgent: '*', allow: '/', disallow: ['/create/', '/library', '/profile', '/api/', '/design-review'] }, sitemap: new URL('/sitemap.xml', site).href }
    : { rules: { userAgent: '*', disallow: '/' } };
}
