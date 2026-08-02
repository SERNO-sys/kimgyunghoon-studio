import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { listUsers } from '@/lib/db/queries';

export const runtime = 'edge';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const db = getDb();
    const allUsers = await listUsers(db);
    const users = allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }));

    return NextResponse.json({ success: true, users });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to load users' },
      { status: 500 }
    );
  }
}
