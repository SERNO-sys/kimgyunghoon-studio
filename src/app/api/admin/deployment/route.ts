import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import {
  deploy,
  getDeploymentHistory,
  rollbackDeployment,
} from '@/lib/cloudflare/deployment';

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
    deployments: getDeploymentHistory(),
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
    const record = await deploy(body.commitHash || 'manual');
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { success: false, message: 'ID is required' },
      { status: 400 }
    );
  }

  const record = rollbackDeployment(id);
  if (!record) {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, deployment: record });
}
