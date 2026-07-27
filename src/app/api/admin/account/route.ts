import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { accountSchema } from '@/lib/admin/account';

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
    account: {
      displayName: session.name,
      newsletter: true,
    },
  });
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
    const result = accountSchema.safeParse(body);
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

    // TODO: persist account settings to D1.
    return NextResponse.json({
      success: true,
      message: 'Account settings saved',
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
