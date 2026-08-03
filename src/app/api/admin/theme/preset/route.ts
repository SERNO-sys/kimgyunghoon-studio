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
 * Accepts a PARTIAL theme payload from the admin UI. The payload is wrapped in
 * a `themeConfig` object and every field is optional (`.partial()`), so a
 * partial update can be deep-merged on top of the site's existing
 * `themeConfig` without ever wiping out unrelated settings.
 *
 * The Zod schema mirrors the AWIE blueprint enums so a malformed payload can
 * never corrupt the stored theme config.
 */
const themeConfigSchema = z.object({
  presetId: z
    .enum(['default', 'modern', 'warm', 'luxury', 'minimal'])
    .optional(),
  intentType: intentTypeSchema.optional(),
  skin: skinSchema.optional(),
  skeleton: skeletonSchema.optional(),
  sections: z.array(sectionSchema).min(1).optional(),
});

// The whole payload is partial: only the fields the frontend actually sends
// are validated and merged. `themeConfig` itself is optional so a caller can
// send just `{ themeConfig: { skin: {...} } }` and nothing else.
const presetSchema = z.object({
  themeConfig: themeConfigSchema.partial().optional(),
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
    // Start from the site's existing themeConfig so a partial update deep-merges
    // on top of it instead of replacing it.
    const themeConfig: ThemeConfig = {
      presetId: site.themeConfig?.presetId ?? 'default',
      ...(site.themeConfig ?? {}),
    };

    // Deep-merge only the fields that were actually provided. Because the
    // schema is `.partial()`, a caller may send just `{ themeConfig: { skin:
    // {...} } }` and the rest of the stored config is preserved untouched.
    const patch = result.data.themeConfig;
    if (patch) {
      if (patch.presetId !== undefined) {
        themeConfig.presetId = patch.presetId;
      }
      if (patch.intentType !== undefined) {
        themeConfig.intentType = patch.intentType;
      }
      if (patch.skin !== undefined) {
        themeConfig.skin = patch.skin;
      }
      if (patch.skeleton !== undefined) {
        themeConfig.skeleton = patch.skeleton;
      }
      if (patch.sections !== undefined) {
        themeConfig.sections = patch.sections;
      }
    }



    await updateSite(db, site.id, { themeConfig });
    return NextResponse.json({
      success: true,
      message: 'Preset saved',
      themeConfig,
    });
  } catch (error) {
    // Log the real error (e.g. the underlying SQLITE_ERROR) so it is visible in
    // the server logs instead of being swallowed by a generic 500 response.
    console.error('DB Update Error (theme preset):', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}


