/**
 * AWIE V2 - Single-shot Input Boundary Adapter.
 *
 * Converts a raw one-line user prompt into a BusinessBrief WITHOUT invoking any
 * AI, WITHOUT inventing facts, and WITHOUT touching the turn-based Question
 * Engine flow.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - This adapter exists BEFORE the Brain. Its ONLY responsibility is
 *     `string -> BusinessBrief`.
 *   - The Brain remains completely unaware of the input source.
 *   - It reuses the existing deterministic extraction/fallback logic
 *     (AiInformationExtractor.extractFallback) and the existing merge mechanism
 *     (MergeEngine) over createEmptyBrief().
 *
 * SHORT INPUT POLICY (absolute):
 *   - Known meaning -> preserve.
 *   - Unknown facts -> remain unspecified.
 *   - It NEVER invents goals, audience, services, prices, products, hours,
 *     address, reviews, certifications, facilities, or demographics.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic, UI
 * concepts, Recipe concepts, ThemeConfig concepts, or capability decisions.
 * It is a pure deterministic boundary adapter.
 */

import {
  createEmptyBrief,
  MergeEngine,
  type BusinessBrief,
  type BusinessBriefPatch,
} from '../../question-engine/brief';
import { AiInformationExtractor } from './extractor';

/** Thrown when the raw prompt is empty or whitespace-only. */
export class EmptyPromptError extends Error {
  constructor() {
    super('Single-shot brief requires a non-empty prompt.');
    this.name = 'EmptyPromptError';
  }
}

/**
 * Converts a raw one-line prompt into a BusinessBrief.
 *
 * Deterministic, synchronous, and free of any external AI/provider invocation.
 * Only the businessType slot is preserved from the raw prompt (via the existing
 * deterministic fallback extraction). All other business facts remain
 * unspecified.
 *
 * @param prompt The raw one-line user input (e.g. "카페").
 * @returns A valid, immutable BusinessBrief.
 * @throws EmptyPromptError when the prompt is empty or whitespace-only.
 */
export function extractSingleShotBrief(prompt: string): BusinessBrief {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    throw new EmptyPromptError();
  }

  const extractor = new AiInformationExtractor();
  const patch: BusinessBriefPatch = extractor.extractFallback(
    'businessType',
    trimmed,
  );

  const merger = new MergeEngine();
  return merger.apply(createEmptyBrief(), patch);
}
