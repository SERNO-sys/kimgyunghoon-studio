import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { listSitesByOwner } from '@/lib/db/queries';
import {
  createDeploymentSnapshot,
  getDeploymentHistoryForSite,
  rollbackToDeployment,
} from '@/lib/deployment';

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
  const deployments = await getDeploymentHistoryForSite(db, siteId);
  return NextResponse.json({ success: true, deployments });
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
    const body = (await request.json().catch(() => ({}))) as {
      commitHash?: string;
    };
    const db = getDb();
    const record = await createDeploymentSnapshot(
      db,
      siteId,
      body.commitHash || 'manual'
    );
    return NextResponse.json({ success: true, deployment: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Deploy failed';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { success: false, message: 'ID is required' },
      { status: 400 }
    );
  }

  const db = getDb();
  const record = await rollbackToDeployment(db, siteId, id);
  if (!record) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, deployment: record });
}
