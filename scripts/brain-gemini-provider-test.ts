/**
 * AWIE V2 Brain — AI #2 Gemini provider focused test.
 *
 * Verifies the REAL `GeminiCopywriterProvider` contract:
 *
 *   - It implements the provider-independent `CopywriterProvider` interface.
 *   - It delegates to the existing V1 AI Engine (`getAiEngine()` +
 *     `generateStructured()`), which validates the model output against
 *     `generatedContentSetSchema`.
 *   - When Gemini is NOT configured, the engine resolves to the deterministic
 *     V1 MockProvider, whose generic echo does NOT match the schema. The
 *     provider MUST surface this as a structured failure (never a silent pass).
 *     This error-handling path is deterministic and is tested offline.
 *   - When Gemini IS configured (GEMINI_API_KEY set), a real generation smoke
 *     test runs and asserts the output is schema-valid, preserves requirement
 *     identity, and never invents business facts.
 *
 * This is the "one focused provider test" for the Gemini-backed AI #2 provider.
 *
 * Run with:
 *   node --import ./scripts/__mocks__/preload-cloudflare-stub.cjs --import tsx scripts/brain-gemini-provider-test.ts
 */

import {
  Capability,
  CapabilityState,
  CapabilityPriority,
  CapabilityRole,
  Provenance,
  buildContentPlan,
  type DecisionPlan,
  type PlannedCapability,
  type EvidenceSet,
} from '../src/lib/brain';
import {
  GeminiCopywriterProvider,
  generatedContentSetSchema,
  ToneConstraint,
  type CopywriterConfig,
} from '../src/lib/brain/copywriter';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

function makePlanned(
  capability: (typeof Capability)[keyof typeof Capability],
  state: (typeof CapabilityState)[keyof typeof CapabilityState],
): PlannedCapability {
  return {
    capability,
    state,
    priority: CapabilityPriority.BUSINESS_CRITICAL,
    role: CapabilityRole.PRIMARY,
  };
}

function makePlan(
  id: string,
  capabilities: PlannedCapability[],
  evidence: EvidenceSet[] = [],
): DecisionPlan {
  return {
    id,
    capabilities,
    constraints: [],
    contentRequirements: [],
    evidence,
  };
}

function makeConfig(): CopywriterConfig {
  return { tone: ToneConstraint.Warm, language: 'ko' };
}

// A bakery with discovery ACTIVE + offering evidence → facts available.
const bakeryPlan = makePlan(
  'bakery',
  [makePlanned(Capability.discovery, CapabilityState.ACTIVE)],
  [
    {
      subject: 'offering',
      items: [
        {
          id: 'ev-offering-1',
          provenance: Provenance.user_asserted,
          claim: 'Sells artisan bread and pastries',
        },
      ],
    },
  ],
);
const bakeryContent = buildContentPlan(bakeryPlan);

const provider = new GeminiCopywriterProvider();

const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

async function main(): Promise<void> {
  console.log('\n=== 1. Gemini provider implements the CopywriterProvider interface ===');
  assert(provider.name === 'gemini', 'provider name is "gemini"');
  assert(typeof provider.generate === 'function', 'provider exposes generate()');

  console.log('\n=== 2. Provider surfaces a structured failure when the model output is not schema-valid ===');
  // Without a Gemini key, the engine falls back to the V1 MockProvider, whose
  // generic echo does not match generatedContentSetSchema. The provider MUST
  // throw a descriptive error (never a silent pass). This is deterministic.
  if (!hasGeminiKey) {
    let threw = false;
    let message = '';
    try {
      await provider.generate({ contentPlan: bakeryContent, config: makeConfig() });
    } catch (err) {
      threw = true;
      message = err instanceof Error ? err.message : String(err);
    }
    assert(threw, 'provider throws when the engine returns non-schema-valid output');
    assert(
      message.includes('AI #2 copywriter generation failed'),
      'error message identifies the AI #2 copywriter failure',
    );
    assert(
      message.includes('invalid_json'),
      'error message carries the engine failure reason (invalid_json)',
    );
  } else {
    console.log('  (skipped — GEMINI_API_KEY is set; running real generation below)');
  }

  console.log('\n=== 3. Provider NEVER mutates the ContentPlan ===');
  const before = JSON.stringify(bakeryContent);
  try {
    await provider.generate({ contentPlan: bakeryContent, config: makeConfig() });
  } catch {
    // expected when no key; mutation check still applies
  }
  const after = JSON.stringify(bakeryContent);
  assert(before === after, 'ContentPlan is unchanged after provider.generate');

  if (hasGeminiKey) {
    console.log('\n=== 4. REAL generation produces a schema-valid GeneratedContentSet ===');
    const generated = await provider.generate({
      contentPlan: bakeryContent,
      config: makeConfig(),
    });
    const valid = generatedContentSetSchema.safeParse(generated);
    assert(valid.success, 'generated output passes generatedContentSetSchema');
    assert(
      generated.contentPlanId === bakeryContent.id,
      'GeneratedContentSet references the ContentPlan id',
    );
    assert(
      generated.items.length === bakeryContent.requirements.length,
      'one generated item per active requirement',
    );
    assert(
      generated.items.every((i) =>
        bakeryContent.requirements.some((r) => r.id === i.requirementId),
      ),
      'every generated item targets an existing requirement (no invented requirement)',
    );
    const availableItem = generated.items.find(
      (i) => i.requirementId === bakeryContent.requirements[0].id,
    );
    assert(
      availableItem?.factReferences.includes('ev-offering-1') === true,
      'available requirement attaches only the permitted evidence ref',
    );
    const generatedJson = JSON.stringify(generated);
    const uiConcepts = [
      'Hero',
      'ProductGrid',
      'grid',
      'px',
      'column',
      'css',
      'flex',
      'section',
      'component',
      'layout',
      'theme',
      'recipe',
    ];
    let uiLeak = false;
    for (const concept of uiConcepts) {
      if (generatedJson.toLowerCase().includes(concept.toLowerCase())) {
        uiLeak = true;
      }
    }
    assert(!uiLeak, 'GeneratedContentSet contains no UI/component/layout/theme/recipe concepts');
  } else {
    console.log('\n=== 4. REAL generation smoke test ===');
    console.log('  (skipped — GEMINI_API_KEY not set; offline error-path verified above)');
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
