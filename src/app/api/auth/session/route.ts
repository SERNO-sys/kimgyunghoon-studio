import { NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/admin/session';

export const runtime = 'edge';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({ authenticated: true, user: session });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ authenticated: false });
}
