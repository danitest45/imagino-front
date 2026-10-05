import { NextResponse } from 'next/server';
import preview from '../../../../data/generation-catalog-preview.json';

export const dynamic = 'force-dynamic';
export async function GET() {
  if (process.env.NEXT_PUBLIC_GENERATION_V2_ENABLED !== 'true' ||
      process.env.NEXT_PUBLIC_API_URL !== 'https://imagino-api-ai-staging.onrender.com') {
    return NextResponse.json({ error: 'Unavailable' }, { status: 404 });
  }
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/generation/catalog`, {
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (response.ok) return NextResponse.json({ ...await response.json(), source: 'live' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { /* The explicitly unavailable snapshot lets users explore tools during downtime. */ }
  return NextResponse.json(preview, { headers: { 'Cache-Control': 'no-store' } });
}
