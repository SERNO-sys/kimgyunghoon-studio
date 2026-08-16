/**
 * AWIE V2 — Enrichment Service.
 *
 * The provider-independent enrichment interface. It orchestrates the Gap
 * Analyzer and the Question Mapper to produce the enrichment result the UI can
 * consume later:
 *
 *   {
 *     gaps,
 *     questions,
 *     priority,
 *     enrichmentReady
 *   }
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - This service is PURE and provider-independent. No LLM, no UI.
 *   - It NEVER blocks the canonical one-line generation path. If there are no
 *     gaps, `enrichmentReady` is false and the caller simply proceeds.
 *   - It does NOT create a new frontend architecture.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept.
 */

import { GapAnalyzer, MAX_GAPS, MIN_GAPS } from './gap-analyzer';
import { QuestionMapper } from './question-mapper';
import { resolveLanguage } from '../language';
import { DEFAULT_LANGUAGE, type LanguageCodeValue } from '../language/types';
import {
  GapPriority,
  type EnrichmentGap,
  type EnrichmentResult,
  type GapAnalysisInput,
  type GapPriorityValue,
} from './types';


/**
 * The Enrichment Service.
 *
 * Consumes the existing semantic contracts and returns the enrichment result.
 * It is deterministic and side-effect-free.
 */
export class EnrichmentService {
  private readonly analyzer: GapAnalyzer;
  private readonly mapper: QuestionMapper;

  constructor(analyzer?: GapAnalyzer, mapper?: QuestionMapper) {
    this.analyzer = analyzer ?? new GapAnalyzer();
    this.mapper = mapper ?? new QuestionMapper();
  }

  /**
   * Computes the enrichment result for the given semantic inputs.
   *
   * @param input The semantic inputs (BusinessMeaning, DecisionPlan,
   *   ContentPlan, evidence). All are optional.
   * @returns The enrichment result. `enrichmentReady` is true only when there
   *   is at least one high-value gap worth asking about.
   */
  analyze(input: GapAnalysisInput): EnrichmentResult {
    const gaps = this.analyzer.analyze(input);
    const language = this.resolveLanguage(input);
    const questions = this.mapper.map(gaps, language);
    const priority = this.resolvePriority(gaps);

    return {
      gaps,
      questions,
      priority,
      enrichmentReady: gaps.length > 0,
    };
  }

  /**
   * Resolves the canonical language for the enrichment question text.
   *
   * Resolution order: explicit language hint → detection from the prompt →
   * canonical default. The slot and intent remain canonical Question Engine
   * identifiers regardless of language.
   */
  private resolveLanguage(input: GapAnalysisInput): LanguageCodeValue {
    const context = resolveLanguage(input.prompt, input.languageHint);
    return context.code;
  }


  /**
   * Resolves the overall enrichment priority.
   *
   * The overall priority is the highest priority among the gaps. When there are
   * no gaps, it is DECORATIVE (no enrichment opportunity).
   */
  private resolvePriority(gaps: EnrichmentGap[]): GapPriorityValue {
    if (gaps.length === 0) return GapPriority.DECORATIVE;
    const order: Record<GapPriorityValue, number> = {
      MANDATORY: 0,
      CONVERSION_CRITICAL: 1,
      BUSINESS_CRITICAL: 2,
      SUPPORTING: 3,
      DECORATIVE: 4,
    };
    return gaps.reduce<GapPriorityValue>((highest, gap) => {
      return order[gap.priority] < order[highest] ? gap.priority : highest;
    }, GapPriority.DECORATIVE);
  }
}

/**
 * Convenience function: run the enrichment service in one call.
 */
export function analyzeEnrichment(input: GapAnalysisInput): EnrichmentResult {
  return new EnrichmentService().analyze(input);
}

/**
 * The enrichment question budget constants.
 *
 * These are the semantic bounds on how many questions the enrichment flow may
 * ask. The analyzer caps gaps at MAX_GAPS (5); the service never asks more than
 * that. The minimum meaningful set is MIN_GAPS (3).
 */
export const ENRICHMENT_QUESTION_BUDGET = {
  min: MIN_GAPS,
  max: MAX_GAPS,
} as const;
