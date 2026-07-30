export type Tier = 'FREE' | 'PRO';

export interface TierLimits {
  MAX_SITES: number;
  MAX_MENUS: number;
  MAX_MEDIA_COUNT: number;
  MAX_MEDIA_SIZE_MB: number;
  AI_AUTOBUILD_LIMIT: number;
  AI_PATCH_LIMIT: number;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  FREE: {
    MAX_SITES: 1,
    MAX_MENUS: 5,
    MAX_MEDIA_COUNT: 20,
    MAX_MEDIA_SIZE_MB: 5,
    AI_AUTOBUILD_LIMIT: 3,
    AI_PATCH_LIMIT: 10,
  },
  PRO: {
    MAX_SITES: 10,
    MAX_MENUS: 10,
    MAX_MEDIA_COUNT: 200,
    MAX_MEDIA_SIZE_MB: 15,
    AI_AUTOBUILD_LIMIT: 20,
    AI_PATCH_LIMIT: 100,
  },
};

/**
 * 현재는 모든 사용자를 FREE 티어로 간주합니다.
 * 향후 DB user 테이블이나 구독 테이블과 연동하면 동적으로 변경 가능합니다.
 */
export function getCurrentUserTier(): Tier {
  return 'FREE';
}
