/**
 * AWIE V2 — Enrichment Regeneration Bridge.
 *
 * This is the minimal bridge that re-enters user answers (as semantic
 * evidence) into the EXISTING Brain/BusinessBrief/content pipeline and
 * produces an updated ThemeConfig for an already-built site.
 *
 * REGENERATION MODEL (reuses the Golden Path — no redesign):
 *
 *   Initial build (canonical one-line path)
 *     → Gap Analyzer
 *     → Questions
 *     → User answers
 *     → [THIS BRIDGE] existing semantic normalization / Decision / ContentPlan
 *     → existing Copywriter
 *     → existing RecipeMerger
 *     → ThemeConfig update
 *
 * The bridge does NOT:
 *   - add ThemeConfig fields
 *   - add Renderer IDs
 *   - add CSS / layout concepts / component IDs
 *   - invent facts (unanswered fields are never fabricated)
 *   - modify the canonical one-line generation path
 *
 * It ONLY re-runs the existing BrainGoldenPath with the additional semantic
 * evidence and persists the resulting ThemeConfig via the existing DB update
 * path. The Fact Validator remains authoritative: if the regenerated content
 * fails validation, the bridge returns a structured failure and does NOT
 * overwrite the site.
 */

import { BrainGoldenPath } from '../golden-path/brain-pipeline';
import {
  GeminiCopywriterProvider,
  type CopywriterProvider,
} from '../brain/copywriter';
import type { EvidenceSet } from '../brain/evidence';
import type { ThemeConfig } from '@/types/site';
import type { Site } from '@/lib/db/types';
import type { ThemeConfig as V2ThemeConfig } from '@/lib/theme-config/v2/types';

/**
 * The result of a regeneration attempt.
 *
 * A discriminated union. On success it carries the updated V2 ThemeConfig, the
 * legacy ThemeConfig (for the existing renderer), and the regenerated Brain
 * outputs for traceability. On failure it carries a structured reason.
 */
export type RegenerationResult =
  | {
      ok: true;
      /** The updated V2.6 ThemeConfig (single source of truth). */
      v2Config: V2ThemeConfig;
      /** The legacy ThemeConfig shape the existing renderer consumes. */
      legacyConfig: ThemeConfig;
      /** The regenerated DecisionPlan (WHAT). */
      plan: import('../brain/decision-plan').DecisionPlan;
      /** The regenerated ContentPlan. */
      contentPlan: import('../brain/content-plan').ContentPlan;
      /** The Fact Validation result. Must be PASS. */
      factValidation: import('../brain/fact-validator').FactValidationResult;
    }
  | {
      ok: false;
      error: {
        code: 'EMPTY_PROMPT' | 'NO_COMPATIBLE_RECIPE' | 'FACT_VALIDATION_FAILED' | 'BRIDGE_FAILED';
        message: string;
      };
    };

/**
 * The enrichment regeneration service.
 *
 * Provider-agnostic: the copywriter provider is injected at the composition
 * root (defaults to the deterministic mock, Gemini in production). It reuses
 * the existing BrainGoldenPath orchestrator unchanged — the only difference is
 * that additional semantic evidence is passed through so the Decision Planner
 * can re-evaluate capability states (GENERIC → ACTIVE) from the newly
 * available scoped evidence.
 */
export class EnrichmentRegenerator {
  private readonly goldenPath: BrainGoldenPath;

  constructor(copywriter: CopywriterProvider = new GeminiCopywriterProvider()) {
    this.goldenPath = new BrainGoldenPath(copywriter);
  }

  /**
   * Re-runs the Golden Path with the original prompt plus the new semantic
   * evidence, then produces the updated ThemeConfig.
   *
   * SAFETY: this NEVER fabricates facts. Only the evidence actually supplied
   * is passed into the pipeline. Unanswered fields are simply absent — the
   * existing Fact Validator rules remain authoritative and the pipeline stops
   * if the regenerated content fails validation.
   *
   * @param prompt The original one-line prompt used for the initial build.
   * @param evidence The semantic evidence derived from user answers.
   */
  async regenerate(
    prompt: string,
    evidence: EvidenceSet[]
  ): Promise<RegenerationResult> {
    const pipeline = await this.goldenPath.run(prompt, { evidence });
    if (!pipeline.ok) {
      return {
        ok: false,
        error: {
          code: pipeline.error.code,
          message: pipeline.error.message,
        },
      };
    }

    // V2.6 execution boundary: reuse the existing RecipeMerger + Design
    // Intelligence exactly as the canonical autobuild path does.
    const mergeResult = this.goldenPath.execute(pipeline);
    const v2Config = mergeResult.config;

    // Map the V2 config into the legacy ThemeConfig shape the existing
    // renderer consumes. This mirrors the autobuild route's adapter.
    const legacyConfig = this.toLegacyThemeConfig(v2Config, pipeline);

    return {
      ok: true,
      v2Config,
      legacyConfig,
      plan: pipeline.plan,
      contentPlan: pipeline.contentPlan,
      factValidation: pipeline.factValidation,
    };
  }

  /**
   * Persists the regenerated ThemeConfig onto an existing site via the
   * existing DB update path. This is the ONLY write the bridge performs.
   *
   * @param site The existing site record to update.
   * @param v2Config The regenerated V2 ThemeConfig.
   * @param legacyConfig The regenerated legacy ThemeConfig.
   */
  async persist(
    site: Site,
    v2Config: V2ThemeConfig,
    legacyConfig: ThemeConfig
  ): Promise<Site | null> {
    const { updateSite } = await import('../db/queries');
    const { getDb } = await import('../db/client');
    const db = getDb();
    return updateSite(db, site.id, {
      themeConfig: legacyConfig,
      // The V2 config is the single source of truth; persist it alongside the
      // legacy shape so the renderer-facing config and the canonical config
      // stay in sync. The DB column is a JSON blob.
      ...(v2Config as unknown as Record<string, unknown>),
    });
  }

  /**
   * Maps the V2 ThemeConfig into the legacy ThemeConfig shape the existing
   * renderer consumes. This is a deterministic, typed conversion of
   * already-generated values — it never invents copy.
   */
  private toLegacyThemeConfig(
    v2: V2ThemeConfig,
    pipeline: Extract<Awaited<ReturnType<BrainGoldenPath['run']>>, { ok: true }>
  ): ThemeConfig {
    const legacy = v2 as unknown as ThemeConfig;
    const name = (v2.metadata?.title || '').trim().slice(0, 50) || 'My Site';
    const description = v2.metadata?.description || '';
    legacy.content = {
      hero_title: name,
      hero_subtitle: v2.metadata?.tagline || '',
      about_bio: description,
    };
    const v2Sections = v2.resources?.sections ?? [];
    const validSections = v2Sections
      .map((s) => s.id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    if (validSections.length > 0) {
      legacy.sections = validSections;
    }
    return legacy;
  }
}
