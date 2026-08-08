import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { listSitesByOwner } from '@/lib/db/queries';

// MILESTONE J — TOTAL LEGACY ABSORPTION:
// This route is a THIN WRAPPER. ALL deployment logic (snapshot creation,
// history listing, rollback) is owned by the Delivery Layer's
// DeploymentService. The route only resolves the current site and delegates.
import { DeploymentService } from '@/lib/editor-integration/server';

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
  const deploymentService = new DeploymentService(db);
  const deployments = await deploymentService.getDeploymentHistoryForSite(siteId);
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
    const deploymentService = new DeploymentService(db);
    const result = await deploymentService.recordDeployment(
      siteId,
      body.commitHash || 'manual',
    );
    return NextResponse.json({ success: true, deployment: result.deployment });
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
  const deploymentService = new DeploymentService(db);
  const record = await deploymentService.rollbackToDeployment(siteId, id);
  if (!record) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, deployment: record });
}
