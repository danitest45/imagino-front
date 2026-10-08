import { NextResponse } from 'next/server';
/** Historical public media proxy is retired. Owner media uses authenticated job identity. */
export async function GET() {
  return NextResponse.json({ error: 'Open this asset through your authenticated workspace.' },
    { status: 410, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
