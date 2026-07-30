import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { domainSchema } from '@/lib/admin/domain';
import { getDb } from '@/lib/db/client';
import {
  createDomain,
  deleteDomain,
  getDomainByName,
  listDomainsBySite,
  listSitesByOwner,
} from '@/lib/db/queries';
import type { Domain } from '@/lib/db/types';

export const runtime = 'edge';

async function getCurrentSiteId(userId: string): Promise<string | null> {
  const db = getDb();
  const sites = await listSitesByOwner(db, userId);
  return sites[0]?.id ?? null;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const siteId = await getCurrentSiteId(session.userId);
  if (!siteId) {
    return NextResponse.json(
      { success: false, message: 'No site configured' },
      { status: 404 }
    );
  }

  const db = getDb();
  const domains = await listDomainsBySite(db, siteId);
  return NextResponse.json({ success: true, domains });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const siteId = await getCurrentSiteId(session.userId);
  if (!siteId) {
    return NextResponse.json(
      { success: false, message: 'No site configured' },
      { status: 404 }
    );
  }

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

    const domain = parsed.data.domain.toLowerCase().trim();
    const db = getDb();

    if (await getDomainByName(db, domain)) {
      return NextResponse.json(
        { success: false, message: 'Domain already registered' },
        { status: 409 }
      );
    }

    const domainRow: Domain = {
      id: crypto.randomUUID(),
      siteId,
      domain,
      verified: false,
      isPrimary: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createDomain(db, domainRow);

    return NextResponse.json({
      success: true,
      message: 'Domain registered. DNS verification pending.',
      domain: domainRow,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to connect domain' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { success: false, message: 'ID is required' },
      { status: 400 }
    );
  }

  const siteId = await getCurrentSiteId(session.userId);
  if (!siteId) {
    return NextResponse.json(
      { success: false, message: 'No site configured' },
      { status: 404 }
    );
  }

  const db = getDb();
  const domain = await db.domains.findById(id);
  if (!domain || domain.siteId !== siteId) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }

  await deleteDomain(db, id);
  return NextResponse.json({ success: true });
}
