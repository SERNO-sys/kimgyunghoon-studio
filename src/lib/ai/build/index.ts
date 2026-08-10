/**
 * AWIE V2 - Milestone A: AI Build module barrel export.
 *
 * This module wires the design-only Question Engine, Industry Registry, and
 * Recipe Engine to the provider-agnostic AI Engine, producing a deterministic
 * guided build flow:
 *
 *   Question (AI extraction) -> BusinessBrief -> Planner -> ThemeConfig
 *
 * ARCHITECTURAL BOUNDARY:
 *   - The AI only EXTRACTS facts; it never decides business types or layout.
 *   - The Planner resolves the industry, selects a recipe, and merges into a
 *     ThemeConfig via the existing RecipeMerger.
 *   - ThemeConfig is the immutable SSOT. Nothing here mutates Core.
 */

export {
  AiInformationExtractor,
} from './extractor';

export {
  BuildPlanner,
  type PlanInput,
  type PlanResult,
} from './planner';

export {
  GuidedBuildService,
  type QuestionTurnInput,
  type QuestionTurnResult,
} from './service';

export {
  extractSingleShotBrief,
  EmptyPromptError,
} from './single-shot-brief';
