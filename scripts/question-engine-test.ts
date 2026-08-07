/**
 * AWIE V2 - Phase 05 Milestone 1 Question Engine Smoke Test.
 *
 * Mocks a user input, runs the Analyzer -> Planner -> Executor -> Merger
 * pipeline, applies a BusinessBriefPatch, updates field confidence, and passes
 * validation.
 *
 * Run with: npx tsx scripts/question-engine-test.ts
 */

import {
  DefaultQuestionBudget,
  MergeEngine,
  QuestionPipeline,
  Validator,
  createEmptyBrief,
  createEmptyState,
  type BusinessBrief,
  type BusinessBriefPatch,
  type ConversationState,
  type InformationExtractor,
  type Question,
  type UserAnswer,
} from '../src/lib/question-engine';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(name: string): void {
  console.log(`\n=== ${name} ===`);
}

/**
 * A MOCK InformationExtractor.
 *
 * The AI does NOT decide business types; it only EXTRACTS them into a patch.
 * This mock maps a question's slot to a deterministic patch.
 */
class MockExtractor implements InformationExtractor {
  extract(question: Question, answer: UserAnswer): BusinessBriefPatch {
    switch (question.slot) {
      case 'businessType':
        return {
          businessType: { primary: 'restaurant', secondary: ['cafe'] },
          confidence: { businessType: 0.95 },
        };
      case 'goals':
        return {
          goals: { primary: 'increase_orders', additional: ['brand_awareness'] },
          confidence: { goals: 0.9 },
        };
      case 'audience':
        return {
          audience: { primary: 'young professionals', secondary: ['families'] },
          confidence: { audience: 0.85 },
        };
      case 'personality':
        return {
          personality: { tone: 'friendly', values: ['fresh', 'local'] },
          confidence: { personality: 0.88 },
        };
      case 'services':
        return {
          services: { items: ['pasta', 'pizza', 'wine'] },
          confidence: { services: 0.92 },
        };
      case 'contactPreference':
        return {
          contactPreference: { channel: 'phone', value: '02-1234-5678' },
          confidence: { contactPreference: 0.9 },
        };
      default:
        return {};
    }
  }
}

function run(): void {
  // ---------------------------------------------------------------------------
  section('Setup: empty brief + empty state');
  let brief: BusinessBrief = createEmptyBrief();
  let state: ConversationState = createEmptyState();
  const extractor = new MockExtractor();
  const pipeline = new QuestionPipeline({
    extractor,
    budget: new DefaultQuestionBudget(6, 0.8),
  });

  check('brief starts at version 0', brief.version === 0);
  check('state starts with no questions asked', state.askedQuestions.size === 0);
  check('state starts with no confidence', Object.keys(state.confidence).length === 0);

  // ---------------------------------------------------------------------------
  section('Pipeline Turn 1: businessType');
  {
    const answer: UserAnswer = { questionId: 'q-businessType', text: 'We run a restaurant.' };
    const result = pipeline.run(brief, state, answer);

    check('T1: question asked targets businessType', result.question?.slot === 'businessType');
    check('T1: brief version incremented to 1', result.brief.version === 1);
    check('T1: businessType filled', result.brief.businessType?.primary === 'restaurant');
    check('T1: businessType confidence = 0.95', result.state.confidence.businessType === 0.95);
    check('T1: decision log has 1 entry', result.state.decisionLog.length === 1);
    check('T1: history has 1 turn', result.state.history.length === 1);

    brief = result.brief;
    state = result.state;
  }

  // ---------------------------------------------------------------------------
  section('Pipeline Turn 2: goals');
  {
    const answer: UserAnswer = { questionId: 'q-goals', text: 'We want more orders.' };
    const result = pipeline.run(brief, state, answer);

    check('T2: question targets goals', result.question?.slot === 'goals');
    check('T2: brief version incremented to 2', result.brief.version === 2);
    check('T2: goals filled', result.brief.goals?.primary === 'increase_orders');
    check('T2: goals confidence = 0.9', result.state.confidence.goals === 0.9);
    check('T2: decision log has 2 entries', result.state.decisionLog.length === 2);

    brief = result.brief;
    state = result.state;
  }

  // ---------------------------------------------------------------------------
  section('Pipeline Turn 3: audience');
  {
    const answer: UserAnswer = { questionId: 'q-audience', text: 'Young professionals.' };
    const result = pipeline.run(brief, state, answer);

    check('T3: question targets audience', result.question?.slot === 'audience');
    check('T3: brief version incremented to 3', result.brief.version === 3);
    check('T3: audience filled', result.brief.audience?.primary === 'young professionals');
    check('T3: audience confidence = 0.85', result.state.confidence.audience === 0.85);

    brief = result.brief;
    state = result.state;
  }

  // ---------------------------------------------------------------------------
  section('Pipeline Turn 4: personality');
  {
    const answer: UserAnswer = { questionId: 'q-personality', text: 'Friendly and fresh.' };
    const result = pipeline.run(brief, state, answer);

    check('T4: question targets personality', result.question?.slot === 'personality');
    check('T4: brief version incremented to 4', result.brief.version === 4);
    check('T4: personality filled', result.brief.personality?.tone === 'friendly');

    brief = result.brief;
    state = result.state;
  }

  // ---------------------------------------------------------------------------
  section('Pipeline Turn 5: services');
  {
    const answer: UserAnswer = { questionId: 'q-services', text: 'Pasta, pizza, wine.' };
    const result = pipeline.run(brief, state, answer);

    check('T5: question targets services', result.question?.slot === 'services');
    check('T5: brief version incremented to 5', result.brief.version === 5);
    check('T5: services filled', result.brief.services?.items.length === 3);

    brief = result.brief;
    state = result.state;
  }

  // ---------------------------------------------------------------------------
  section('Pipeline Turn 6: contactPreference (budget reached)');
  {
    const answer: UserAnswer = { questionId: 'q-contactPreference', text: 'Call us.' };
    const result = pipeline.run(brief, state, answer);

    check('T6: question targets contactPreference', result.question?.slot === 'contactPreference');
    check('T6: brief version incremented to 6', result.brief.version === 6);
    check('T6: contactPreference filled', result.brief.contactPreference?.channel === 'phone');

    brief = result.brief;
    state = result.state;
  }

  // ---------------------------------------------------------------------------
  section('Validation: patch passes validation');
  {
    const validator = new Validator();
    const patch: BusinessBriefPatch = {
      businessType: { primary: 'restaurant', secondary: [] },
      confidence: { businessType: 0.95 },
    };
    const result = validator.validate(brief, patch, state);

    check('V1: patch is valid (no errors)', result.ok === true);
    check('V2: no contradiction problems', result.problems.every((p) => p.category !== 'contradiction'));
  }

  // ---------------------------------------------------------------------------
  section('Validation: contradiction is caught');
  {
    const validator = new Validator();
    const patch: BusinessBriefPatch = {
      businessType: { primary: 'cafe', secondary: [] },
      confidence: { businessType: 0.95 },
    };
    const result = validator.validate(brief, patch, state);

    check('V3: contradiction detected', result.problems.some((p) => p.category === 'contradiction'));
    check('V4: validation fails on contradiction', result.ok === false);
  }

  // ---------------------------------------------------------------------------
  section('MergeEngine: immutability');
  {
    const mergeEngine = new MergeEngine();
    const before = brief;
    const patch: BusinessBriefPatch = {
      goals: { primary: 'increase_orders', additional: ['retention'] },
      confidence: { goals: 0.95 },
    };
    const after = mergeEngine.apply(before, patch);

    check('M1: original brief not mutated', before.version === 6);
    check('M2: new brief version incremented', after.version === 7);
    check('M3: goals updated in new brief', after.goals?.additional.includes('retention') === true);
  }

  // ---------------------------------------------------------------------------
  console.log(`\n========================================`);
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
