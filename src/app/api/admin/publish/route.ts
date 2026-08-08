import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';

import {
  getSiteById,
  listSitesByOwner,
} from '@/lib/db/queries';

// The shared Publish pipeline. The admin Publish button MUST delegate to the
// SAME PublishOrchestrator + shared singleton repository that the CMS publish
// route uses. This is what makes a publish from the admin UI visible to the
// Version History panel and the Delivery Layer (Public Serve API). The route
// remains a THIN WRAPPER: it resolves the site's Draft ThemeConfig from D1 and
// delegates the VersionSnapshot freeze + Release to the orchestrator, then
// delegates ALL legacy D1 deployment bookkeeping (deployment snapshot,
// isPublished flag, subdomain) to the Delivery Layer's DeploymentService so the
// tenant subdomain still resolves.
//
// MILESTONE J — TOTAL LEGACY ABSORPTION:
// The route NO LONGER re-implements any deployment logic. It consumes the
// DeploymentResult snapshot returned by DeploymentService.recordDeployment().
import {
  DeploymentService,
  PublishOrchestrator,
  projectRepository,
  resolveDraftThemeConfig,
} from '@/lib/editor-integration/server';

export const runtime = 'edge';


/**
 * Resolves the site to publish. Prefers an explicit `siteId` from the request
 * body (so the client can publish the currently selected site even when a user
 * owns multiple sites). Falls back to the user's first site for backward
 * compatibility.
 */
async function resolveSiteId(
  userId: string,
  requestedSiteId?: string
): Promise<string | null> {
  const db = getDb();

  if (requestedSiteId) {
    const site = await getSiteById(db, requestedSiteId);
    if (site && site.ownerId === userId) {
      return site.id;
    }
  }

  const sites = await listSitesByOwner(db, userId);
  return sites[0]?.id ?? null;
}

export async function POST(request: NextRequest) {
  // Read the session cookie directly from the request object. In the Edge
  // runtime the `cookies()` API from `next/headers` can be unreliable for
  // Route Handlers, so we use the same request-based helper the middleware
  // uses. This guarantees the authenticated user is resolved before we write
  // to D1.
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }


  let requestedSiteId: string | undefined;
  try {
    const body = (await request.json()) as { siteId?: unknown };
    requestedSiteId =
      typeof body?.siteId === 'string' && body.siteId ? body.siteId : undefined;
  } catch {
    // No JSON body (e.g. legacy clients) — fall back to the first site.
  }


  const siteId = await resolveSiteId(session.userId, requestedSiteId);
  if (!siteId) {
    return NextResponse.json(
      { success: false, message: 'No site configured' },
      { status: 404 }
    );
  }

  try {
    const db = getDb();

    // 1. DELEGATE TO THE SHARED PUBLISH PIPELINE.
    //
    //    The admin Publish button MUST freeze the site's Draft ThemeConfig into
    //    an immutable VersionSnapshot and designate it as Live via the SAME
    //    PublishOrchestrator + shared singleton repository that the CMS publish
    //    route uses. This is what makes a publish from the admin UI visible to
    //    the Version History panel and the Delivery Layer (Public Serve API).
    //
    //    The Draft is resolved from D1 via the shared resolver (the single
    //    source of truth for the publish pipeline). The orchestrator's getDraft
    //    is synchronous, so we resolve the Draft first and close over it.
    const draft = await resolveDraftThemeConfig(db, siteId);
    if (!draft) {
      return NextResponse.json(
        {
          success: false,
          message: '발행할 홈페이지 구성이 없습니다. 먼저 홈페이지를 생성해 주세요.',
        },
        { status: 400 }
      );
    }

    const publishOrchestrator = new PublishOrchestrator(
      projectRepository,
      () => draft,
    );
    const publishResult = await publishOrchestrator.publish(
      siteId,
      session.userId,
      '1.0.0',
    );
    console.log('[Publish] VersionSnapshot created:', publishResult.snapshot.id);

    // 2. DELEGATE ALL LEGACY D1 DEPLOYMENT BOOKKEEPING TO THE DELIVERY LAYER.
    //
    //    The DeploymentService is the SINGLE owner of the legacy deployment
    //    snapshot + isPublished flag + tenant subdomain resolution. It returns
    //    a DeploymentResult snapshot (deployment record + subdomain + publicUrl)
    //    that this route consumes verbatim. The route NEVER re-derives these.
    const deploymentService = new DeploymentService(db);
    const deploymentResult = await deploymentService.recordDeployment(
      siteId,
      'manual',
    );
    console.log('[Publish] deployment recorded:', deploymentResult.deployment.id);

    return NextResponse.json({
      success: true,
      message: '1초 만에 홈페이지가 실시간 갱신 배포되었습니다!',
      deployment: deploymentResult.deployment,
      siteId,
      publicUrl: deploymentResult.publicUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed';
    console.error('[Publish] error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
