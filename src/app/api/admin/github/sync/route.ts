import { NextResponse } from 'next/server';
import { syncToGitHub } from '@/lib/github/sync';
import { deploy } from '@/lib/cloudflare/deployment';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { siteId, changes, commitMessage } = body;

    if (!siteId || !commitMessage) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const syncResult = await syncToGitHub(
      siteId,
      changes ?? [],
      commitMessage
    );
    if (!syncResult.success) {
      return NextResponse.json(syncResult, { status: 403 });
    }

    const commitHash = crypto.randomUUID().slice(0, 7);
    const deployment = await deploy(commitHash);

    return NextResponse.json({
      success: true,
      message: 'GitHub sync and deployment triggered',
      sync: syncResult,
      deployment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
