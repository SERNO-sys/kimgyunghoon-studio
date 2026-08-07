/**
 * AWIE V2 - State Management & Slot Filling.
 *
 * The Question Engine uses a Slot Filling architecture. Confidence is NOT a
 * global number — it is tracked PER FIELD (e.g. businessType: 0.95,
 * audience: 0.60).
 *
 * ConversationState tracks everything the engine needs to make decisions:
 *   - askedQuestions: which questions have already been asked.
 *   - derivedFacts: facts inferred from user answers.
 *   - assumptions: assumptions the engine is making while a slot is unfilled.
 *   - history: the ordered transcript of the conversation.
 *   - decisionLog: WHY each question was asked (traceability).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure state modeling.
 */

import type { Confidence, SlotKey } from './brief';

/** A single question the engine asks the user. */
export interface Question {
  /** A stable, unique question id. */
  id: string;
  /** The slot this question targets. */
  slot: SlotKey;
  /** The human-readable question text. */
  text: string;
  /** The intent behind asking this question. */
  intent: string;
}

/** A user's answer to a question. */
export interface UserAnswer {
  /** The question id being answered. */
  questionId: string;
  /** The raw answer text. */
  text: string;
}

/** A fact derived from a user answer. */
export interface DerivedFact {
  /** The slot the fact relates to. */
  slot: SlotKey;
  /** The fact value. */
  value: string;
  /** The confidence of this derived fact (0..1). */
  confidence: Confidence;
}

/** An assumption the engine is making while a slot is unfilled. */
export interface Assumption {
  /** The slot the assumption relates to. */
  slot: SlotKey;
  /** The assumed value. */
  value: string;
  /** The confidence of this assumption (0..1). */
  confidence: Confidence;
}

/** A single entry in the decision log explaining WHY a question was asked. */
export interface DecisionLogEntry {
  /** The question id. */
  questionId: string;
  /** The slot targeted. */
  slot: SlotKey;
  /** The reason the question was asked. */
  reason: string;
  /** The timestamp of the decision. */
  timestamp: string;
}

/** A single conversation turn. */
export interface ConversationTurn {
  /** The question asked. */
  question: Question;
  /** The user's answer. */
  answer: UserAnswer;
  /** The timestamp of the turn. */
  timestamp: string;
}

/** Per-field confidence tracking. */
export type FieldConfidence = Partial<Record<SlotKey, Confidence>>;

/**
 * The conversation state.
 *
 * Immutable by convention: the pipeline produces new state snapshots rather
 * than mutating in place.
 */
export interface ConversationState {
  /** Questions already asked, keyed by question id. */
  askedQuestions: Map<string, Question>;
  /** Facts derived from user answers. */
  derivedFacts: DerivedFact[];
  /** Assumptions the engine is making. */
  assumptions: Assumption[];
  /** The ordered conversation transcript. */
  history: ConversationTurn[];
  /** The decision log explaining WHY each question was asked. */
  decisionLog: DecisionLogEntry[];
  /** Per-field confidence. */
  confidence: FieldConfidence;
}

/** Creates an empty ConversationState. */
export function createEmptyState(): ConversationState {
  return {
    askedQuestions: new Map(),
    derivedFacts: [],
    assumptions: [],
    history: [],
    decisionLog: [],
    confidence: {},
  };
}

/**
 * The StateManager.
 *
 * Provides deterministic, immutable helpers for evolving the conversation
 * state. Each method returns a NEW state.
 */
export class StateManager {
  /** Records that a question was asked, returning a new state. */
  recordQuestion(state: ConversationState, question: Question, reason: string): ConversationState {
    const askedQuestions = new Map(state.askedQuestions);
    askedQuestions.set(question.id, question);

    const decisionLog: DecisionLogEntry[] = [
      ...state.decisionLog,
      {
        questionId: question.id,
        slot: question.slot,
        reason,
        timestamp: new Date().toISOString(),
      },
    ];

    return { ...state, askedQuestions, decisionLog };
  }

  /** Records a conversation turn, returning a new state. */
  recordTurn(state: ConversationState, question: Question, answer: UserAnswer): ConversationState {
    const history: ConversationTurn[] = [
      ...state.history,
      { question, answer, timestamp: new Date().toISOString() },
    ];
    return { ...state, history };
  }

  /** Adds a derived fact, returning a new state. */
  addDerivedFact(state: ConversationState, fact: DerivedFact): ConversationState {
    return { ...state, derivedFacts: [...state.derivedFacts, fact] };
  }

  /** Adds an assumption, returning a new state. */
  addAssumption(state: ConversationState, assumption: Assumption): ConversationState {
    return { ...state, assumptions: [...state.assumptions, assumption] };
  }

  /** Updates per-field confidence, returning a new state. */
  updateConfidence(state: ConversationState, updates: FieldConfidence): ConversationState {
    return { ...state, confidence: { ...state.confidence, ...updates } };
  }

  /** Returns whether a question has already been asked. */
  hasAsked(state: ConversationState, questionId: string): boolean {
    return state.askedQuestions.has(questionId);
  }
}
