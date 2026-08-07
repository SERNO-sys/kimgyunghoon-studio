/**
 * AWIE V2 - The Orchestration Pipeline.
 *
 * The Question Engine is a Workflow Orchestrator, NOT an AI model. The AI is
 * merely a step inside the engine used for extraction. The engine's core
 * responsibility is Gap Analysis, Question Strategy, State Management, and
 * orchestrating the BusinessBriefPatch flow.
 *
 * The pipeline is broken into strict, isolated steps:
 *
 *   Analyzer (Gap Analysis)
 *     -> Planner (Question Strategy / Intent)
 *     -> Executor (Drafting the prompt / calling AI)
 *     -> Merger (Applying the patch)
 *
 * Separation of Concerns:
 *   - The Question Engine decides WHAT needs to be asked.
 *   - The AI (InformationExtractor) EXTRACTS the answers into a Patch.
 *   - The MergeEngine updates the Brief.
 *
 * Hooks: BeforeQuestion, AfterQuestion, AfterMerge.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure orchestration infrastructure.
 */

import type { BusinessBrief, BusinessBriefPatch } from './brief';
import { MergeEngine } from './brief';
import type { ConversationState, Question, UserAnswer } from './state';
import { StateManager } from './state';
import type { QuestionBudget, ValidationResult } from './validator';
import { DefaultQuestionBudget, Validator } from './validator';

/** A gap identified by the Analyzer. */
export interface Gap {
  /** The slot that is not yet confidently filled. */
  slot: string;
  /** The current confidence of the slot (0..1). */
  confidence: number;
  /** Why this slot is considered a gap. */
  reason: string;
}

/** The output of the Analyzer step. */
export interface AnalysisResult {
  /** The gaps found in the current brief. */
  gaps: Gap[];
}

/** The output of the Planner step. */
export interface PlanResult {
  /** The next question to ask, or undefined if none. */
  question?: Question;
  /** The reason the question is being asked. */
  reason: string;
}

/** The output of the Executor step. */
export interface ExecutionResult {
  /** The patch extracted by the AI. */
  patch: BusinessBriefPatch;
  /** The validation result of the patch. */
  validation: ValidationResult;
}

/** The final output of the pipeline. */
export interface PipelineResult {
  /** The updated brief. */
  brief: BusinessBrief;
  /** The updated conversation state. */
  state: ConversationState;
  /** The question that was asked (if any). */
  question?: Question;
  /** The patch that was applied (if any). */
  patch?: BusinessBriefPatch;
  /** Whether the pipeline should stop. */
  done: boolean;
}

/**
 * The InformationExtractor.
 *
 * The future AI wrapper. The AI does NOT decide business types; it only
 * EXTRACTS them into a BusinessBriefPatch. This interface is mocked in
 * Milestone 1 (Design Only).
 */
export interface InformationExtractor {
  /**
   * Extracts a BusinessBriefPatch from a user's answer to a question.
   */
  extract(question: Question, answer: UserAnswer, state: ConversationState): BusinessBriefPatch;
}

/** The BeforeQuestion hook. */
export interface BeforeQuestionHook {
  /** Called before a question is asked. May modify the question. */
  beforeQuestion(question: Question, state: ConversationState): Question;
}

/** The AfterQuestion hook. */
export interface AfterQuestionHook {
  /** Called after a question is asked. */
  afterQuestion(question: Question, state: ConversationState): void;
}

/** The AfterMerge hook. */
export interface AfterMergeHook {
  /** Called after a patch is merged into the brief. */
  afterMerge(brief: BusinessBrief, patch: BusinessBriefPatch, state: ConversationState): void;
}

/** Options for constructing the pipeline. */
export interface QuestionPipelineOptions {
  /** The InformationExtractor (AI wrapper). */
  extractor: InformationExtractor;
  /** The question budget policy. */
  budget?: QuestionBudget;
  /** Optional hooks. */
  hooks?: {
    beforeQuestion?: BeforeQuestionHook[];
    afterQuestion?: AfterQuestionHook[];
    afterMerge?: AfterMergeHook[];
  };
}

/**
 * The Analyzer step.
 *
 * Performs Gap Analysis: identifies which slots are not yet confidently
 * filled.
 */
export class Analyzer {
  analyze(brief: BusinessBrief, state: ConversationState): AnalysisResult {
    const gaps: Gap[] = [];
    const coreSlots: (keyof BusinessBrief)[] = [
      'businessType',
      'goals',
      'audience',
      'personality',
      'services',
      'contactPreference',
    ];

    for (const slot of coreSlots) {
      const confidence = state.confidence[slot as keyof typeof state.confidence] ?? 0;
      if (brief[slot] === undefined || confidence < 0.8) {
        gaps.push({
          slot: slot as string,
          confidence,
          reason: brief[slot] === undefined ? 'Slot is empty.' : 'Confidence below threshold.',
        });
      }
    }

    return { gaps };
  }
}

/**
 * The Planner step.
 *
 * Decides the next question to ask based on the gaps and the budget.
 */
export class Planner {
  constructor(private readonly budget: QuestionBudget) {}

  plan(gaps: Gap[], state: ConversationState): PlanResult {
    if (this.budget.shouldStop(state)) {
      return { reason: 'Budget reached. No further questions.' };
    }

    // Pick the gap with the lowest confidence (highest priority).
    const target = [...gaps].sort((a, b) => a.confidence - b.confidence)[0];
    if (!target) {
      return { reason: 'No gaps remain.' };
    }

    const question: Question = {
      id: `q-${target.slot}`,
      slot: target.slot as Question['slot'],
      text: `Please tell us more about your ${target.slot.replace(/([A-Z])/g, ' $1').toLowerCase()}.`,
      intent: `Fill the "${target.slot}" slot (confidence ${Math.round(target.confidence * 100)}%).`,
    };

    return { question, reason: `Gap in "${target.slot}" with confidence ${target.confidence}.` };
  }
}

/**
 * The Executor step.
 *
 * Drafts the prompt and calls the InformationExtractor (AI). The AI only
 * extracts; it does not decide.
 */
export class Executor {
  constructor(
    private readonly extractor: InformationExtractor,
    private readonly validator: Validator,
  ) {}

  execute(
    question: Question,
    answer: UserAnswer,
    brief: BusinessBrief,
    state: ConversationState,
  ): ExecutionResult {
    const patch = this.extractor.extract(question, answer, state);
    const validation = this.validator.validate(brief, patch, state);
    return { patch, validation };
  }
}

/**
 * The Merger step.
 *
 * Applies the patch to the brief via the MergeEngine and updates confidence.
 */
export class Merger {
  constructor(
    private readonly mergeEngine: MergeEngine,
    private readonly stateManager: StateManager,
  ) {}

  merge(
    brief: BusinessBrief,
    patch: BusinessBriefPatch,
    state: ConversationState,
  ): { brief: BusinessBrief; state: ConversationState } {
    const nextBrief = this.mergeEngine.apply(brief, patch);
    const nextState = this.stateManager.updateConfidence(state, patch.confidence ?? {});
    return { brief: nextBrief, state: nextState };
  }
}

/**
 * The QuestionPipeline.
 *
 * Orchestrates Analyzer -> Planner -> Executor -> Merger and fires hooks.
 */
export class QuestionPipeline {
  private readonly analyzer: Analyzer;
  private readonly planner: Planner;
  private readonly executor: Executor;
  private readonly merger: Merger;
  private readonly stateManager: StateManager;
  private readonly beforeQuestion: BeforeQuestionHook[];
  private readonly afterQuestion: AfterQuestionHook[];
  private readonly afterMerge: AfterMergeHook[];

  constructor(options: QuestionPipelineOptions) {
    const budget = options.budget ?? new DefaultQuestionBudget();
    const validator = new Validator();
    const mergeEngine = new MergeEngine();
    this.stateManager = new StateManager();

    this.analyzer = new Analyzer();
    this.planner = new Planner(budget);
    this.executor = new Executor(options.extractor, validator);
    this.merger = new Merger(mergeEngine, this.stateManager);

    this.beforeQuestion = options.hooks?.beforeQuestion ?? [];
    this.afterQuestion = options.hooks?.afterQuestion ?? [];
    this.afterMerge = options.hooks?.afterMerge ?? [];
  }

  /**
   * Runs one full pipeline turn given a user answer.
   */
  run(
    brief: BusinessBrief,
    state: ConversationState,
    answer: UserAnswer,
  ): PipelineResult {
    // 1. Analyzer: Gap Analysis.
    const { gaps } = this.analyzer.analyze(brief, state);

    // 2. Planner: Question Strategy.
    const plan = this.planner.plan(gaps, state);
    if (!plan.question) {
      return { brief, state, done: true };
    }

    // Fire BeforeQuestion hooks.
    let question = plan.question;
    for (const hook of this.beforeQuestion) {
      question = hook.beforeQuestion(question, state);
    }

    // Record the question in state (with the decision log reason).
    let nextState = this.stateManager.recordQuestion(state, question, plan.reason);

    // 3. Executor: Draft prompt + call AI (extraction only).
    const execution = this.executor.execute(question, answer, brief, nextState);

    // Fire AfterQuestion hooks.
    for (const hook of this.afterQuestion) {
      hook.afterQuestion(question, nextState);
    }

    // Record the turn.
    nextState = this.stateManager.recordTurn(nextState, question, answer);

    // 4. Merger: Apply the patch.
    const merged = this.merger.merge(brief, execution.patch, nextState);

    // Fire AfterMerge hooks.
    for (const hook of this.afterMerge) {
      hook.afterMerge(merged.brief, execution.patch, merged.state);
    }

    return {
      brief: merged.brief,
      state: merged.state,
      question,
      patch: execution.patch,
      done: false,
    };
  }
}
