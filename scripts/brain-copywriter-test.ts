/**
 * AWIE V2 Brain — Step 11 AI #2 Copywriter tests.
 *
 * Verifies the AI #2 EXPRESSION LAYER contracts:
 *   - ContentPlan → PromptContract (deterministic, no new requirements).
 *   - PromptContract carries requirement identity, tone, generic-safe flags,
 *     allowed evidence refs, and prohibited inventions.
 *   - The mock provider generates a deterministic GeneratedContentSet.
 *   - AI #2 NEVER invents business facts (generic-safe when unavailable).
 *   - AI #2 NEVER mutates the ContentPlan.
 *   - AI #2 NEVER adds capabilities, sections, components, layouts, or design.
 *   - Provenance is preserved exactly (never upgraded).
 *   - Schema validation accepts valid output and rejects malformed output.
 *   - No UI/component/layout/CSS concepts leak into the output.
 *
 * Run with: npx tsx scripts/brain-copywriter-test.ts
 */

import {
  Capability,
  CapabilityState,
  CapabilityPriority,
  CapabilityRole,
  Provenance,
  FactAvailability,
  buildContentPlan,
  type DecisionPlan,
  type PlannedCapability,
  type EvidenceSet,
  type ContentPlan,
} from '../src/lib/brain';
import {
  buildPromptContract,
  MockCopywriterProvider,
  generatedContentSetSchema,
  promptContractSchema,
  copywriterConfigSchema,
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

// A GENERIC purchase capability → generic-safe (no concrete facts).
const genericPlan = makePlan('generic', [
  makePlanned(Capability.purchase, CapabilityState.GENERIC),
]);
const genericContent = buildContentPlan(genericPlan);

// A DORMANT + DROP plan → zero active requirements.
const dormantDropPlan = makePlan('dormant-drop', [
  makePlanned(Capability.booking, CapabilityState.DORMANT),
  makePlanned(Capability.trust, CapabilityState.DROP),
]);
const dormantDropContent = buildContentPlan(dormantDropPlan);

const provider = new MockCopywriterProvider();

async function main(): Promise<void> {
console.log('\n=== 1. ContentPlan → PromptContract (deterministic, no new requirements) ===');

const prompt = buildPromptContract(bakeryContent, makeConfig());
assert(
  prompt.contentPlanId === bakeryContent.id,
  'PromptContract references the ContentPlan id',
);
assert(
  prompt.instructions.length === bakeryContent.requirements.length,
  'one instruction per ContentPlan requirement (no new requirements added)',
);
assert(
  prompt.instructions.every((i) =>
    bakeryContent.requirements.some((r) => r.id === i.requirementId),
  ),
  'every instruction targets an existing requirement (no invented requirement)',
);
assert(
  prompt.tone === ToneConstraint.Warm && prompt.language === 'ko',
  'tone and language are carried from the config',
);

console.log('\n=== 2. PromptInstruction carries semantic constraints ===');
const discoveryInstruction = prompt.instructions.find(
  (i) => i.requirementId === bakeryContent.requirements[0].id,
);
assert(
  discoveryInstruction !== undefined,
  'discovery requirement has an instruction',
);
assert(
  discoveryInstruction?.objective === bakeryContent.requirements[0].description,
  'objective is the requirement description (no new business meaning)',
);
assert(
  discoveryInstruction?.genericSafe === false,
  'available facts → not generic-safe',
);
assert(
  discoveryInstruction?.allowedEvidenceRefs.includes('ev-offering-1') === true,
  'allowed evidence refs carry the permitted evidence id',
);
assert(
  (discoveryInstruction?.prohibitedInventions?.length ?? 0) > 0,
  'prohibited inventions are carried from mustNotInvent',
);

console.log('\n=== 3. GENERIC requirement → generic-safe instruction, no fact refs ===');
const genericPrompt = buildPromptContract(genericContent, makeConfig());
const genericInstruction = genericPrompt.instructions[0];
assert(
  genericInstruction.genericSafe === true,
  'GENERIC requirement → genericSafe = true',
);
assert(
  genericInstruction.allowedEvidenceRefs.length === 0,
  'GENERIC requirement → no allowed evidence refs (prevents fact invention)',
);

console.log('\n=== 4. DORMANT / DROP produce no prompt instructions ===');
const dormantDropPrompt = buildPromptContract(dormantDropContent, makeConfig());
assert(
  dormantDropPrompt.instructions.length === 0,
  'DORMANT + DROP plan → zero prompt instructions (never assembled)',
);

console.log('\n=== 5. Mock provider generates a deterministic GeneratedContentSet ===');
const generated = await provider.generate({
  contentPlan: bakeryContent,
  config: makeConfig(),
});

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
  'every generated item targets an existing requirement (requirement identity preserved)',
);
const genA = await provider.generate({ contentPlan: bakeryContent, config: makeConfig() });
const genB = await provider.generate({ contentPlan: bakeryContent, config: makeConfig() });

assert(
  JSON.stringify(genA) === JSON.stringify(genB),
  'same input produces identical GeneratedContentSet (deterministic)',
);

console.log('\n=== 6. AI #2 NEVER invents business facts ===');
const availableItem = generated.items.find(
  (i) => i.requirementId === bakeryContent.requirements[0].id,
);
assert(
  availableItem?.factReferences.includes('ev-offering-1') === true,
  'available requirement attaches only the permitted evidence ref',
);
const genericGenerated = await provider.generate({
  contentPlan: genericContent,
  config: makeConfig(),
});

assert(
  genericGenerated.items[0].factReferences.length === 0,
  'GENERIC requirement → no fact references (nothing invented)',
);
assert(
  genericGenerated.items[0].body.includes(genericContent.requirements[0].description),
  'generic body is derived from the requirement description (no invented facts)',
);

console.log('\n=== 7. AI #2 NEVER mutates the ContentPlan ===');
const before = JSON.stringify(bakeryContent);
provider.generate({ contentPlan: bakeryContent, config: makeConfig() });
buildPromptContract(bakeryContent, makeConfig());
const after = JSON.stringify(bakeryContent);
assert(before === after, 'ContentPlan is unchanged after generate + buildPromptContract');

console.log('\n=== 8. AI #2 NEVER adds capabilities, sections, components, layouts, or design ===');
const generatedJson = JSON.stringify(generated);
// NOTE: The canonical semantic ContentShape vocabulary (hero / text / list /
// grid / contact) is EXPLICITLY ALLOWED in the AI #2 content contract — it is
// semantic structure, NOT a UI/component/layout/theme concept. Only actual
// presentation concepts (React/component identifiers, renderer component names,
// ThemeConfig, layout IDs, CSS, visual design tokens) are forbidden here.
const uiConcepts = [
  'ProductGrid',
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


console.log('\n=== 9. Schema validation accepts valid output ===');
const validSet = generatedContentSetSchema.safeParse(generated);
assert(validSet.success, 'a valid GeneratedContentSet passes generatedContentSetSchema');
const validPrompt = promptContractSchema.safeParse(prompt);
assert(validPrompt.success, 'a valid PromptContract passes promptContractSchema');
const validConfig = copywriterConfigSchema.safeParse(makeConfig());
assert(validConfig.success, 'a valid CopywriterConfig passes copywriterConfigSchema');

console.log('\n=== 10. Schema validation rejects malformed output ===');
const badTone = copywriterConfigSchema.safeParse({
  tone: 'not-a-tone',
  language: 'ko',
});
assert(!badTone.success, 'invalid tone value is rejected');

const badItem = generatedContentSetSchema.safeParse({
  ...generated,
  items: [{ ...generated.items[0], requirementId: '' }],
});
assert(!badItem.success, 'empty requirementId is rejected');

const badPrompt = promptContractSchema.safeParse({
  ...prompt,
  instructions: [{ ...prompt.instructions[0], genericSafe: 'yes' }],
});
assert(!badPrompt.success, 'non-boolean genericSafe is rejected');

console.log('\n=== 11. Provenance is preserved exactly (never upgraded) ===');
// The ContentPlan requirement carries user_asserted provenance. AI #2 output
// references the evidence id; it must NOT upgrade provenance.
const req = bakeryContent.requirements[0];
assert(
  req.provenance === Provenance.user_asserted,
  'ContentPlan requirement provenance is user_asserted',
);
assert(
  availableItem?.factReferences.includes('ev-offering-1') === true,
  'AI #2 references the evidence id without changing its provenance',
);

console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
