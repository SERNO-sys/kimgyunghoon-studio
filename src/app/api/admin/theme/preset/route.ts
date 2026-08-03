import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { listSitesByOwner, updateSite } from '@/lib/db/queries';
import { PRESETS } from '@/constants/presets';
import type { ThemeConfig } from '@/types/site';

export const runtime = 'edge';

const presetSchema = z.object({
  presetId: z.enum(['default', 'modern', 'warm', 'luxury', 'minimal']),
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
      ...(site.themeConfig ?? {}),
      presetId: result.data.presetId,
    };

    await updateSite(db, site.id, { themeConfig });
    return NextResponse.json({ success: true, message: 'Preset saved' });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
