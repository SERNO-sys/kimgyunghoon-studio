import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getDomainByName } from '@/lib/db/queries';

export const runtime = 'edge';

const MAIN_DOMAINS = new Set([
  'localhost',
  '127.0.0.1',
]);

const mainDomain =
  typeof process !== 'undefined' && process.env ? process.env.MAIN_DOMAIN : undefined;
if (mainDomain) {
  MAIN_DOMAINS.add(mainDomain);
  MAIN_DOMAINS.add(`www.${mainDomain}`);
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const host = (searchParams.get('host') || '').toLowerCase().split(':')[0];

  if (!host || MAIN_DOMAINS.has(host)) {
    return NextResponse.json({ siteId: null });
  }

  const db = getDb();
  const domain = await getDomainByName(db, host);
  if (!domain) {
    return NextResponse.json({ siteId: null });
  }

  return NextResponse.json({ siteId: domain.siteId });
}
