/**
 * AWIE V2 - Question Engine barrel export.
 *
 * The Question Engine is a Workflow Orchestrator, NOT an AI model. The AI is
 * merely a step inside the engine used for extraction.
 *
 * Separation of Concerns:
 *   - The Question Engine decides WHAT needs to be asked.
 *   - The AI (InformationExtractor) EXTRACTS the answers into a Patch.
 *   - The MergeEngine updates the Brief.
 *
 * Phase 05 is DESIGN ONLY. Implementation is intentionally postponed.
 */
export {
  BRIEF_SCHEMA_VERSION,
  MergeEngine,
  SLOT_KEYS,
  audienceSchema,
  businessTypeSchema,
  contactPreferenceSchema,
  createEmptyBrief,
  goalsSchema,
  optionalPreferencesSchema,
  personalitySchema,
  servicesSchema,
  type BusinessBrief,
  type BusinessBriefPatch,
  type Confidence,
  type SlotKey,
} from './brief';

export {
  StateManager,
  createEmptyState,
  type Assumption,
  type ConversationState,
  type ConversationTurn,
  type DecisionLogEntry,
  type DerivedFact,
  type FieldConfidence,
  type Question,
  type UserAnswer,
} from './state';

export {
  Analyzer,
  Executor,
  Merger,
  Planner,
  QuestionPipeline,
  type AfterMergeHook,
  type AfterQuestionHook,
  type AnalysisResult,
  type BeforeQuestionHook,
  type ExecutionResult,
  type Gap,
  type InformationExtractor,
  type PipelineResult,
  type PlanResult,
  type QuestionPipelineOptions,
} from './pipeline';

export {
  DefaultQuestionBudget,
  Validator,
  type QuestionBudget,
  type ValidationCategory,
  type ValidationProblem,
  type ValidationResult,
} from './validator';
