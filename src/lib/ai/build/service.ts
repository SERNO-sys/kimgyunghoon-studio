/**
 * AWIE V2 - Milestone A1: GuidedBuildService.
 *
 * A thin, async orchestration layer that drives the guided build flow:
 *
 *   Question (AI extraction) -> BusinessBrief -> Planner -> ThemeConfig
 *
 * The frozen QuestionPipeline is synchronous (its Executor calls the
 * InformationExtractor synchronously), so this service reuses the pipeline's
 * synchronous building blocks — Analyzer, Planner, Merger, StateManager,
 * Validator, DefaultQuestionBudget — directly and awaits the async
 * AiInformationExtractor itself. This keeps Core untouched.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - The AI only EXTRACTS facts; it never decides business types or layout.
 *   - The service is a thin WRAPPER (Buy Before Build) over existing engines.
 *   - It NEVER mutates ThemeConfig or Core.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure orchestration.
 */

import type { BusinessBrief, BusinessBriefPatch } from '../../question-engine/brief';
import { createEmptyBrief, MergeEngine } from '../../question-engine/brief';
import type { ConversationState, Question, UserAnswer } from '../../question-engine/state';
import { createEmptyState, StateManager } from '../../question-engine/state';
import type { QuestionBudget, ValidationResult } from '../../question-engine/validator';
import { DefaultQuestionBudget, Validator } from '../../question-engine/validator';
import { Analyzer, Planner, Merger } from '../../question-engine/pipeline';
import { AiInformationExtractor, type TextGenerator } from './extractor';
import { BuildPlanner, type PlanResult } from './planner';


/** The input for a single guided-build question turn. */
export interface QuestionTurnInput {
  /** The current brief (or empty to start). */
  brief?: BusinessBrief;
  /** The current conversation state (or empty to start). */
  state?: ConversationState;
  /** The user's answer to the previously asked question. */
  answer: UserAnswer;
}

/** The result of a single guided-build question turn. */
export interface QuestionTurnResult {
  /** The updated brief. */
  brief: BusinessBrief;
  /** The updated conversation state. */
  state: ConversationState;
  /** The next question to ask, or undefined if the brief is complete. */
  question?: Question;
  /** The patch that was applied this turn (if any). */
  patch?: BusinessBriefPatch;
  /** The validation result of the applied patch. */
  validation: ValidationResult;
  /** Whether the guided flow is complete and ready to plan. */
  done: boolean;
}

/**
 * The GuidedBuildService.
 *
 * Drives the Question Engine turn-by-turn with the real AI extractor, then
 * hands the completed brief to the BuildPlanner to produce a ThemeConfig.
 */
export class GuidedBuildService {
  private readonly extractor: AiInformationExtractor;
  private readonly analyzer: Analyzer;
  private readonly planner: Planner;
  private readonly merger: Merger;
  private readonly stateManager: StateManager;
  private readonly validator: Validator;
  private readonly budget: QuestionBudget;
  private readonly buildPlanner: BuildPlanner;

  constructor(options?: { budget?: QuestionBudget; generator?: TextGenerator }) {
    this.extractor = new AiInformationExtractor(options?.generator);
    this.analyzer = new Analyzer();
    this.budget = options?.budget ?? new DefaultQuestionBudget();
    this.planner = new Planner(this.budget);
    this.merger = new Merger(new MergeEngine(), new StateManager());
    this.stateManager = new StateManager();
    this.validator = new Validator();
    this.buildPlanner = new BuildPlanner();
  }


  /**
   * Runs one guided-build turn given a user answer.
   */
  async runTurn(input: QuestionTurnInput): Promise<QuestionTurnResult> {
    const brief = input.brief ?? createEmptyBrief();
    const state = input.state ?? createEmptyState();

    // 1. Analyzer: Gap Analysis.
    const { gaps } = this.analyzer.analyze(brief, state);

    // 2. Planner: Question Strategy.
    const plan = this.planner.plan(gaps, state);
    if (!plan.question) {
      return { brief, state, validation: { ok: true, problems: [] }, done: true };
    }

    const question = plan.question;

    // 3. Record the question in state.
    let nextState = this.stateManager.recordQuestion(state, question, plan.reason);

    // 4. Executor: AI extraction (async).
    const patch = await this.extractor.extract(question, input.answer);

    // 5. Validate the patch.
    const validation = this.validator.validate(brief, patch, nextState);

    // 6. Record the turn.
    nextState = this.stateManager.recordTurn(nextState, question, input.answer);

    // 7. Merger: apply the patch.
    const merged = this.merger.merge(brief, patch, nextState);

    // 8. Determine whether the flow is complete.
    const nextGaps = this.analyzer.analyze(merged.brief, merged.state).gaps;
    const done = nextGaps.length === 0 || this.budget.shouldStop(merged.state);

    return {
      brief: merged.brief,
      state: merged.state,
      question,
      patch,
      validation,
      done,
    };
  }

  /**
   * Plans a site build from a completed brief.
   */
  plan(brief: BusinessBrief, userPreferences?: Record<string, unknown>): PlanResult {
    return this.buildPlanner.plan({ brief, userPreferences });
  }
}
