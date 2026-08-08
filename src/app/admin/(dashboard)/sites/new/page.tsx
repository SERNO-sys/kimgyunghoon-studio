import { redirect } from 'next/navigation';
import { getSession } from '@/lib/admin/session';
import { NewSiteClient } from './page.client';

export const runtime = 'edge';

/**
 * AWIE V2 - Phase 20.2: Create Site entry point.
 *
 * A thin server page that guards the route (auth) and renders the Dumb Client
 * wizard. The client NEVER composes or mutates ThemeConfig; it relays snapshots
 * to /api/ai/build/* and, on completion, commits the planned config via
 * /api/ai/build/commit, then redirects to the Preview page.
 *
 * Phase 20.2: This entry point is now ALWAYS available so a user with existing
 * projects can create additional sites (multi-project support). The previous
 * `sites.length > 0` redirect that blocked second-site creation is removed.
 */
export default async function NewSitePage() {
  const session = await getSession();
  if (!session) {
    redirect('/admin/login');
  }

  return <NewSiteClient />;
}


