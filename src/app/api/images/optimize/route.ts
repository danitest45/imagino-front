import { NextRequest, NextResponse } from 'next/server';
import { allowedMediaUrl, downloadPublicImage } from '../../../../lib/server-media';

export const runtime = 'nodejs';

/**
 * Lightweight image proxy that hints upstream services to return smaller, mobile-friendly payloads.
 * We avoid heavy native dependencies here but still normalize headers and cache behavior for the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');
  const requestedFormat = (searchParams.get('format') ?? 'webp').toLowerCase();
  const preferredFormat = requestedFormat === 'avif' ? 'avif' : 'webp';
  const requestedWidth = Number.parseInt(searchParams.get('width') ?? '0', 10);
  const targetWidth = Number.isFinite(requestedWidth) && requestedWidth > 0
    ? Math.min(requestedWidth, 4096)
    : 1024;

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const upstreamUrl = allowedMediaUrl(rawUrl);
    // Append a generic width hint; many providers respect either `w` or `width` query params.
    upstreamUrl.searchParams.set('width', String(targetWidth));

    const { bytes, contentType } = await downloadPublicImage(upstreamUrl,
      `${preferredFormat === 'avif' ? 'image/avif,' : ''}image/webp,image/*;q=0.8`);

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'X-Imagino-Optimized-Width': String(targetWidth),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unable to fetch permitted image' }, { status: 400 });
  }
}
