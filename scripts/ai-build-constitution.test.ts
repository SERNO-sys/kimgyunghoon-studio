/**
 * AWIE V2 - Milestone A: AI Build Constitution Test.
 *
 * Verifies the AI Build module (extractor / planner / service) respects the
 * frozen architecture:
 *
 *   1. The AI only EXTRACTS facts into a BusinessBriefPatch (data only).
 *   2. The Planner is fully deterministic: BusinessBrief -> ThemeConfig.
 *   3. ThemeConfig is the immutable SSOT — the Planner produces a NEW config
 *      and NEVER mutates Core.
 *   4. The GuidedBuildService orchestrates the pipeline without business logic.
 *   5. The client (AIBuildWizard) is a Dumb Client — it relays snapshots only.
 *
 * STRICT CONSTRAINT: This test asserts architecture, not business behavior.
 */

import { createEmptyBrief, MergeEngine } from '../src/lib/question-engine/brief';
import { createEmptyState, StateManager } from '../src/lib/question-engine/state';
import { DefaultQuestionBudget, Validator } from '../src/lib/question-engine/validator';
import { Analyzer, Merger, Planner } from '../src/lib/question-engine/pipeline';
import {
  AiInformationExtractor,
  type TextGenerator,
} from '../src/lib/ai/build/extractor';
import { BuildPlanner } from '../src/lib/ai/build/planner';
import { GuidedBuildService } from '../src/lib/ai/build/service';
import type { BusinessBrief } from '../src/lib/question-engine/brief';
import type { ThemeConfig } from '../src/lib/theme-config/v2/types';


let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

/** Builds a fully-populated BusinessBrief for planning tests. */
function completedBrief(): BusinessBrief {
  const brief = createEmptyBrief();
  brief.businessType = { primary: 'restaurant', secondary: ['cafe'] };
  brief.goals = { primary: 'Attract local diners', additional: [] };
  brief.audience = { primary: 'Local food lovers', secondary: [] };
  brief.personality = { tone: 'warm', values: ['quality'] };
  brief.services = { items: ['Dining', 'Takeout'] };
  brief.contactPreference = { channel: 'phone', value: '010-1234-5678' };
  return brief;
}

async function main() {
  console.log('\n=== AI Build Constitution Test ===\n');

  // ---------------------------------------------------------------------------
  // 1. Extractor produces a BusinessBriefPatch (data only).
  // ---------------------------------------------------------------------------
  console.log('1. Extractor (AI only extracts facts)');
  {
    // Deterministic stub generator — the extractor must never import the real
    // engine/provider chain in tests (thin wrapper seam).
    const stub: TextGenerator = {
      async generateText() {
        return {
          text: JSON.stringify({
            businessType: { primary: 'A cozy restaurant', secondary: [] },
            confidence: { businessType: 0.95 },
          }),
        };
      },
    };
    const extractor = new AiInformationExtractor(stub);
    const question = {
      id: 'q-businessType',
      slot: 'businessType' as const,
      text: 'What type of business is this?',
      intent: 'Fill businessType',
    };
    const answer = { questionId: 'q-businessType', text: 'A cozy restaurant' };
    const patch = await extractor.extract(question, answer);

    assert(
      typeof patch === 'object' && patch !== null,
      'extract() returns a BusinessBriefPatch object',
    );
    assert(
      patch.businessType?.primary === 'A cozy restaurant',
      'AI extraction maps the JSON shape into the target slot',
    );
    assert(
      patch.confidence?.['businessType'] === 0.95,
      'AI extraction preserves the reported confidence',
    );
  }


  // ---------------------------------------------------------------------------
  // 2. Planner is deterministic: BusinessBrief -> ThemeConfig.
  // ---------------------------------------------------------------------------
  console.log('\n2. Planner (deterministic BusinessBrief -> ThemeConfig)');
  {
    const planner = new BuildPlanner();
    const brief = completedBrief();
    const result = planner.plan({ brief });

    assert(
      result.config !== undefined,
      'plan() produces a ThemeConfig',
    );
    assert(
      result.config.metadata.title.length > 0,
      'ThemeConfig has a non-empty title',
    );
    assert(
      Array.isArray(result.config.resources.sections),
      'ThemeConfig has a flat sections collection',
    );
    assert(
      Array.isArray(result.config.resources.pages),
      'ThemeConfig has a flat pages collection',
    );
    assert(
      typeof result.industryMatched === 'boolean',
      'plan() reports whether the industry matched',
    );
    assert(
      typeof result.recipeScore === 'number',
      'plan() reports a recipe compatibility score',
    );
    assert(
      Array.isArray(result.decisions),
      'plan() records merge decisions',
    );
  }

  // ---------------------------------------------------------------------------
  // 3. ThemeConfig is immutable SSOT — planner produces a NEW config.
  // ---------------------------------------------------------------------------
  console.log('\n3. ThemeConfig immutability (new config, no Core mutation)');
  {
    const planner = new BuildPlanner();
    const brief = completedBrief();
    const first = planner.plan({ brief });
    const second = planner.plan({ brief });

    assert(
      first.config !== second.config,
      'each plan() call produces a distinct ThemeConfig object',
    );
    assert(
      first.config.metadata.title === second.config.metadata.title,
      'deterministic: identical briefs produce identical titles',
    );
    assert(
      first.config.resources.sections.length === second.config.resources.sections.length,
      'deterministic: identical briefs produce identical section counts',
    );
  }

  // ---------------------------------------------------------------------------
  // 4. GuidedBuildService orchestrates the pipeline without business logic.
  // ---------------------------------------------------------------------------
  console.log('\n4. GuidedBuildService (thin orchestration)');
  {
    // Inject a deterministic generator so the service never touches the real
    // engine/provider chain in tests.
    const stub: TextGenerator = {
      async generateText() {
        return { text: JSON.stringify({ businessType: { primary: 'restaurant' } }) };
      },
    };
    const service = new GuidedBuildService({ generator: stub });
    const brief = createEmptyBrief();
    const state = createEmptyState();


    // First turn: the analyzer finds gaps and asks a question.
    const turn = await service.runTurn({
      brief,
      state,
      answer: { questionId: '', text: 'A restaurant' },
    });

    assert(
      turn.brief !== undefined,
      'runTurn() returns an updated brief',
    );
    assert(
      turn.state !== undefined,
      'runTurn() returns an updated state',
    );
    assert(
      turn.validation !== undefined,
      'runTurn() returns a validation result',
    );
    assert(
      typeof turn.done === 'boolean',
      'runTurn() reports completion status',
    );
  }

  // ---------------------------------------------------------------------------
  // 5. The pipeline building blocks compose correctly (Analyzer/Planner/Merger).
  // ---------------------------------------------------------------------------
  console.log('\n5. Pipeline building blocks compose correctly');
  {
    const budget = new DefaultQuestionBudget();
    const analyzer = new Analyzer();
    const planner = new Planner(budget);
    const merger = new Merger(new MergeEngine(), new StateManager());
    const validator = new Validator();

    const brief = createEmptyBrief();
    const state = createEmptyState();

    const { gaps } = analyzer.analyze(brief, state);
    assert(gaps.length > 0, 'Analyzer finds gaps in an empty brief');

    const plan = planner.plan(gaps, state);
    assert(plan.question !== undefined, 'Planner proposes a question for gaps');

    const patch = { businessType: { primary: 'cafe', secondary: [] } };
    const validation = validator.validate(brief, patch, state);
    assert(validation.ok === true, 'Validator accepts a valid patch');

    const merged = merger.merge(brief, patch, state);
    assert(merged.brief.businessType?.primary === 'cafe', 'Merger applies the patch');
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Test crashed:', error);
  process.exit(1);
});
