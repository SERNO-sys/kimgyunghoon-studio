/**
 * AWIE V2 — Enrichment public barrel export.
 *
 * Exposes the provider-independent enrichment contracts and services:
 *   - Gap Analyzer (pure gap detection)
 *   - Question Mapper (maps gaps to existing Question Engine slots)
 *   - Enrichment Service (orchestrates gaps + questions)
 *   - Answer Ingestion Bridge (answers → semantic business evidence)
 *   - Enrichment Regenerator (evidence → regenerated ThemeConfig via the
 *     existing Golden Path)
 *
 * The core gap/question/ingestion modules are PURE (no UI, no Renderer, no
 * ThemeConfig, no AI provider logic). The Regenerator is the minimal bridge
 * that re-enters evidence into the existing Brain pipeline and reuses the
 * existing RecipeMerger — it does NOT redesign the Golden Path.
 */

export * from './types';
export * from './gap-analyzer';
export * from './question-mapper';
export * from './service';
export * from './answer-ingestion';
export * from './regenerate';


