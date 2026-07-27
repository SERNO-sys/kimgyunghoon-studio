import { NextResponse } from 'next/server';
import { domainSchema } from '@/lib/admin/domain';
import {
  connectDomain,
  getDomainStatus,
  removeDomain,
} from '@/lib/cloudflare/domain';

export const runtime = 'edge';

const SITE_ID = 'default';

export async function GET() {
  const result = await getDomainStatus(SITE_ID);
  if (!result.success) {
    return NextResponse.json(result, { status: 403 });
  }
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = domainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid domain',
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await connectDomain(SITE_ID, parsed.data.domain);
    return NextResponse.json(result, {
      status: result.success ? 200 : 403,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to connect domain' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const result = await removeDomain(SITE_ID);
  return NextResponse.json(result, {
    status: result.success ? 200 : 403,
  });
}
