import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { BuildPlanner } from '@/lib/ai/build';
import type { BusinessBrief } from '@/lib/question-engine/brief';

export const runtime = 'edge';

/**
 * POST /api/ai/build/plan
 *
 * Produces a deterministic ThemeConfig from a completed BusinessBrief.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - The AI NEVER decides layout. The Planner is fully deterministic.
 *   - ThemeConfig is the immutable SSOT. The Planner produces a NEW ThemeConfig
 *     and NEVER mutates Core.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { brief, userPreferences } = body as {
      brief?: BusinessBrief;
      userPreferences?: Record<string, unknown>;
    };

    if (!brief || !brief.businessType?.primary) {
      return NextResponse.json(
        { success: false, message: 'A completed brief with a businessType is required' },
        { status: 400 },
      );
    }

    const planner = new BuildPlanner();
    const result = planner.plan({ brief, userPreferences });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[ai/build/plan]', error);
    const message =
      error instanceof Error ? error.message : 'Failed to plan site build';
    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}
