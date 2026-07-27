import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { themeSchema, type ThemeId } from '@/lib/admin/theme';

export const runtime = 'edge';

let mockTheme: { id: ThemeId } = { id: 'default' };

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }
  return NextResponse.json({ success: true, theme: mockTheme });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const result = themeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid input',
          errors: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    mockTheme = result.data;
    return NextResponse.json({ success: true, message: 'Theme saved' });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  mockTheme = { id: 'default' };
  return NextResponse.json({ success: true, message: 'Theme reset' });
}
