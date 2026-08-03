import { z } from 'zod';
import type {
  AiDesignReport,
  IntentType,
  Skin,
  Skeleton,
} from '@/types/site';

/**
 * AWIE (AI Website Intelligence Engine) - Decision Engine response schema.
 *
 * The AI's imagination is controlled by constraining every decision to a
 * strict enum. This Zod schema enforces that the AI's JSON response follows
 * the exact structure defined in the AWIE blueprint (intent_type, skin,
 * skeleton, sections, ai_design_report) so a bad AI response can never break
 * site creation.
 */

export const intentTypeSchema = z.enum([
  'brand_experience',
  'authority',
  'conversion',
  'commerce',
  'community',
]);

export const colorPaletteSchema = z.enum([
  'warm',
  'minimal',
  'trust',
  'luxury',
  'vibrant',
]);

export const fontPairingSchema = z.enum(['sans', 'serif', 'mono']);

export const headerTypeSchema = z.enum(['logo-left', 'logo-center', 'sidebar']);

export const heroTypeSchema = z.enum(['cover', 'split', 'minimal']);

export const skinSchema = z.object({
  color_palette: colorPaletteSchema,
  font_pairing: fontPairingSchema,
});

export const skeletonSchema = z.object({
  header_type: headerTypeSchema,
  hero_type: heroTypeSchema,
});

export const aiDesignReportSchema = z.object({
  analyzed_industry: z.string().min(1),
  reasoning: z.string().min(1),
});

export const sectionSchema = z.enum([
  'hero',
  'about',
  'gallery',
  'menu',
  'services',
  'testimonials',
  'contact',
  'map',
  'faq',
  'blog',
  'products',
  'team',
  'partners',
  'cta',
]);

/**
 * The subset of the autobuild response that the AWIE decision engine owns.
 * Validated strictly so the AI cannot return out-of-spec values.
 */
export const awieDecisionSchema = z.object({
  intent_type: intentTypeSchema,
  skin: skinSchema,
  skeleton: skeletonSchema,
  sections: z.array(sectionSchema).min(1),
  ai_design_report: aiDesignReportSchema,
});

export type AwieDecision = z.infer<typeof awieDecisionSchema>;

/**
 * Safely extracts and validates the AWIE decision fields from a raw AI JSON
 * response. Returns null when the fields are missing or invalid so callers can
 * fall back gracefully without breaking site creation.
 */
export function parseAwieDecision(
  raw: Record<string, unknown>
): AwieDecision | null {
  const result = awieDecisionSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Maps a validated AWIE decision into the ThemeConfig shape stored on a site.
 */
export function toThemeConfigDecision(
  decision: AwieDecision
): {
  intentType: IntentType;
  skin: Skin;
  skeleton: Skeleton;
  sections: string[];
  aiDesignReport: AiDesignReport;
} {
  return {
    intentType: decision.intent_type,
    skin: decision.skin,
    skeleton: decision.skeleton,
    sections: decision.sections,
    aiDesignReport: decision.ai_design_report,
  };
}
