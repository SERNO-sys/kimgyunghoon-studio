import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getGenerationHistory } from '@/lib/ai/history';

export const runtime = 'edge';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }
  return NextResponse.json({
    success: true,
    history: getGenerationHistory(),
  });
}
