import { NextRequest, NextResponse } from 'next/server';

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
    const upstreamUrl = new URL(rawUrl);
    // Append a generic width hint; many providers respect either `w` or `width` query params.
    upstreamUrl.searchParams.set('width', String(targetWidth));

    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      headers: {
        Accept: `${preferredFormat === 'avif' ? 'image/avif,' : ''}image/webp,image/*;q=0.8,*/*;q=0.5`,
      },
    });

    if (!upstreamResponse.ok) {
      const detail = `${upstreamResponse.status} ${upstreamResponse.statusText}`;
      console.error('[optimize-image] Upstream error', detail);
      return NextResponse.json({ error: 'Failed to fetch image', detail }, { status: 502 });
    }

    const buffer = await upstreamResponse.arrayBuffer();
    const contentType = upstreamResponse.headers.get('content-type')
      ?? `image/${preferredFormat}`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'X-Imagino-Optimized-Width': String(targetWidth),
      },
    });
  } catch (error) {
    console.error('[optimize-image] Unexpected error', error);
    return NextResponse.json({ error: 'Unable to optimize image' }, { status: 500 });
  }
}
