import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { setupSchema } from '@/lib/admin/setup';

export const runtime = 'edge';

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
    const result = setupSchema.safeParse(body);

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

    // TODO: persist site configuration to D1 and link ownership to current user.
    // This is a mock response until DB integration is implemented.

    return NextResponse.json({
      success: true,
      message: 'Configuration saved and ownership linked',
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
