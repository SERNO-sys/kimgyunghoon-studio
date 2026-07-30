import { getSettingsBySiteId, upsertSettings } from '@/lib/db/queries';
import type { Db } from '@/lib/db/types';
import { getCurrentUserTier, TIER_LIMITS, type Tier } from '@/lib/config/tiers';

export type AiUsageType = 'autobuild' | 'draft';

interface AiUsage {
  autobuild?: number;
  draft?: number;
}

export function getAiUsage(generalJson: string): AiUsage {
  try {
    const general = JSON.parse(generalJson || '{}') as Record<string, unknown>;
    const usage = general.ai_usage as AiUsage | undefined;
    return usage ?? {};
  } catch {
    return {};
  }
}

function getLimit(type: AiUsageType, tier: Tier): number {
  return type === 'autobuild'
    ? TIER_LIMITS[tier].AI_AUTOBUILD_LIMIT
    : TIER_LIMITS[tier].AI_PATCH_LIMIT;
}

export function checkAiUsage(
  generalJson: string,
  type: AiUsageType,
  tier: Tier = getCurrentUserTier()
): { allowed: boolean; used: number; limit: number; remaining: number } {
  const usage = getAiUsage(generalJson);
  const used = usage[type] ?? 0;
  const limit = getLimit(type, tier);
  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

export async function incrementAiUsage(
  db: Db,
  siteId: string,
  type: AiUsageType,
  tier: Tier = getCurrentUserTier()
): Promise<{ used: number; limit: number; remaining: number }> {
  const settings = await getSettingsBySiteId(db, siteId);
  let general: Record<string, unknown>;
  try {
    general = JSON.parse(settings?.general || '{}') as Record<string, unknown>;
  } catch {
    general = {};
  }

  const usage = (general.ai_usage as AiUsage | undefined) ?? {};
  const used = (usage[type] ?? 0) + 1;
  usage[type] = used;
  general.ai_usage = usage;

  const now = new Date().toISOString();
  const newSettings: import('@/lib/db/types').SiteSettings = {
    id: siteId,
    siteId,
    general: JSON.stringify(general),
    contact: settings?.contact ?? JSON.stringify({ email: '', phone: '' }),
    analytics: settings?.analytics ?? '{}',
    social: settings?.social ?? JSON.stringify({}),
    pages: settings?.pages ?? '[]',
    updatedAt: now,
  };
  await upsertSettings(db, newSettings);

  const limit = getLimit(type, tier);
  return { used, limit, remaining: Math.max(0, limit - used) };
}
