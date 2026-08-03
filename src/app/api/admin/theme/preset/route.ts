import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { listSitesByOwner, updateSite } from '@/lib/db/queries';
import { PRESETS } from '@/constants/presets';
import {
  intentTypeSchema,
  sectionSchema,
  skinSchema,
  skeletonSchema,
} from '@/lib/ai/awie-schema';
import type { ThemeConfig } from '@/types/site';

export const runtime = 'edge';

/**
 * V2 Theme System - Phase 2 (AWIE-aligned).
 *
 * Accepts a partial theme payload from the admin UI. The payload may carry the
 * legacy `presetId` and/or the full AWIE decision-engine fields (`intent_type`,
 * `skin`, `skeleton`, `sections`). Every field is optional so a partial update
 * can be layered on top of the site's existing `themeConfig` (merge, not
 * replace).
 *
 * The Zod schema mirrors the AWIE blueprint enums so a malformed payload can
 * never corrupt the stored theme config.
 */
const presetSchema = z.object({
  presetId: z
    .enum(['default', 'modern', 'warm', 'luxury', 'minimal'])
    .optional(),
  intent_type: intentTypeSchema.optional(),
  skin: skinSchema.optional(),
  skeleton: skeletonSchema.optional(),
  sections: z.array(sectionSchema).min(1).optional(),
});


export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const db = getDb();
  const sites = await listSitesByOwner(db, session.userId);
  if (sites.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No site found' },
      { status: 404 }
    );
  }

  const site = sites[0];
  const presetId = site.themeConfig?.presetId ?? 'default';

  return NextResponse.json({
    success: true,
    presetId,
    skin: site.themeConfig?.skin ?? null,
    skeleton: site.themeConfig?.skeleton ?? null,
    presets: Object.values(PRESETS).map((preset) => ({
      id: preset.presetId,
      name: preset.name,
      description: preset.description,
      colors: preset.colors,
    })),
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
    const result = presetSchema.safeParse(body);
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

    const db = getDb();
    const sites = await listSitesByOwner(db, session.userId);
    if (sites.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No site found' },
        { status: 404 }
      );
    }

    const site = sites[0];
    const themeConfig: ThemeConfig = {
      presetId: site.themeConfig?.presetId ?? 'default',
      ...(site.themeConfig ?? {}),
    };

    // Merge only the fields that were actually provided so a partial update
    // never wipes out unrelated theme settings.
    if (result.data.presetId !== undefined) {
      themeConfig.presetId = result.data.presetId;
    }

    if (result.data.intent_type !== undefined) {
      themeConfig.intentType = result.data.intent_type;
    }
    if (result.data.skin !== undefined) {
      themeConfig.skin = result.data.skin;
    }
    if (result.data.skeleton !== undefined) {
      themeConfig.skeleton = result.data.skeleton;
    }
    if (result.data.sections !== undefined) {
      themeConfig.sections = result.data.sections;
    }


    await updateSite(db, site.id, { themeConfig });
    return NextResponse.json({
      success: true,
      message: 'Preset saved',
      themeConfig,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
