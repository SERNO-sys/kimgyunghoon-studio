/**
 * AWIE V2 — FINAL REAL PRODUCTION INPUT TEST.
 *
 * Drives the EXACT same code path as the production `/api/ai/autobuild` route:
 *
 *   raw Korean prompt
 *     -> BrainGoldenPath.run(prompt)   (IndustryResolver -> RecipeIntegration
 *                                       -> RecipeMerger -> Design Intelligence)
 *     -> BrainGoldenPath.execute(...)  (V2.6 RecipeMerger + Design Intelligence
 *                                       bridge -> final ThemeConfig)
 *
 * This is the deterministic, pure orchestration layer the production route
 * calls. No code is changed, no site is persisted, no D1 is touched. It only
 * TRACES what AWIE actually produces for the counseling-center input.
 *
 * CRITICAL FAILURE RULE:
 *   If "Modern Bistro" / "bistro" / restaurant default content appears anywhere
 *   in the generated ThemeConfig, this test reports FAIL and stops.
 */

import { BrainGoldenPath } from '../src/lib/golden-path/brain-pipeline';
import { extractSingleShotBrief } from '../src/lib/ai/build/single-shot-brief';
import { IndustryResolver, GENERIC_PROFILE, MOCK_INDUSTRY_PROFILES, IndustryRegistry } from '../src/lib/industry-registry';
import { MOCK_RECIPES } from '../src/lib/recipe-engine';

const INPUT =
  '강남역 인근에서 2030 직장인을 대상으로 야간 진료를 진행하는 프라이빗 심리 상담 센터입니다';

let passed = 0;
let failed = 0;

function report(label: string, value: unknown): void {
  console.log(`  ${label}: ${JSON.stringify(value, null, 2)}`);
}

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL  ${label}`);
  }
}

console.log('\n# AWIE V2 — REAL PRODUCTION INPUT TEST (counseling center)\n');
console.log(`INPUT: ${INPUT}\n`);

// ---------------------------------------------------------------------------
// 1. IndustryResolver — direct trace (same resolver the pipeline uses)
// ---------------------------------------------------------------------------
console.log('## 1. IndustryResolver');
{
  const registry = new IndustryRegistry();
  for (const p of MOCK_INDUSTRY_PROFILES) registry.register(p);
  const resolver = new IndustryResolver(registry, GENERIC_PROFILE);
  const brief = extractSingleShotBrief(INPUT);
  const raw = brief.businessType?.primary ?? '';
  const resolution = resolver.resolve(raw);
  report('matched', resolution.matched);
  report('industryId', resolution.profile.industryId);
  report('normalized input', raw);
  assert(resolution.matched === true, 'matched === true');
  assert(resolution.profile.industryId === 'counseling', 'industryId === counseling');
}

// ---------------------------------------------------------------------------
// 2. Full Golden Path (the production autobuild code path)
// ---------------------------------------------------------------------------
console.log('\n## 2. BrainGoldenPath.run + execute (production autobuild path)');
const gp = new BrainGoldenPath();
const pipeline = gp.run(INPUT);
if (!pipeline.ok) {
  console.error(`  FAIL  Golden Path failed: ${pipeline.error.code} — ${pipeline.error.message}`);
  process.exit(1);
}
passed++;
console.log('  PASS  Golden Path returned ok');

const mergeResult = gp.execute(pipeline);
const config = mergeResult.config;

// ---------------------------------------------------------------------------
// 3. RecipeIntegration
// ---------------------------------------------------------------------------
console.log('\n## 3. RecipeIntegration');
report('selected recipeId', pipeline.integration.recipeId);
report('verdict', pipeline.integration.verdict);
report('supportedIndustries', pipeline.recipe?.supportedIndustries ?? 'n/a');
assert(
  pipeline.integration.recipeId !== 'modern-bistro',
  'modern-bistro MUST NOT be selected',
);
assert(
  !String(pipeline.integration.recipeId).toLowerCase().includes('bistro'),
  'recipeId does not contain "bistro"',
);

// ---------------------------------------------------------------------------
// 4. RecipeMerger — title / tagline / description / generated content
// ---------------------------------------------------------------------------
console.log('\n## 4. RecipeMerger (ThemeConfig)');
const meta = config.metadata ?? {};
report('title', meta.title);
report('tagline', meta.tagline);
report('description', meta.description);
report('intent', config.intent);

const fullText = JSON.stringify(config);
assert(!/modern\s*bistro/i.test(fullText), 'no "Modern Bistro" anywhere in config');
assert(!/\bbistro\b/i.test(fullText), 'no "bistro" anywhere in config');
assert(!/restaurant/i.test(fullText), 'no "restaurant" anywhere in config');

// ---------------------------------------------------------------------------
// 5. Design Intelligence — report actual decisions
// ---------------------------------------------------------------------------
console.log('\n## 5. Design Intelligence decisions');
const settings = (config.resources?.settings ?? {}) as Record<string, unknown>;
const skin = (settings.skin ?? {}) as Record<string, unknown>;
const skeleton = (settings.skeleton ?? {}) as Record<string, unknown>;
const reportDI = (settings.aiDesignReport ?? {}) as Record<string, unknown>;
report('archetype', reportDI.archetype ?? 'n/a');
report('hero variant', skeleton.heroType ?? 'n/a');
report('CTA priority', reportDI.ctaPriority ?? 'n/a');
report('section order', config.resources?.pages?.map((p) => p.sectionIds).flat() ?? 'n/a');
report('section variants', reportDI.sectionVariants ?? 'n/a');
report('palette', skin.colorPalette ?? 'n/a');
report('typography', skin.fontPairing ?? 'n/a');
report('capabilities', reportDI.capabilities ?? 'n/a');
report('design rationale', reportDI.reasoning ?? 'n/a');


// ---------------------------------------------------------------------------
// 6. ThemeConfig — verify Design Intelligence decisions are present
// ---------------------------------------------------------------------------
console.log('\n## 6. ThemeConfig resources');
report('resources.settings present', config.resources?.settings !== undefined);
report('resources.sections count', config.resources?.sections?.length ?? 0);
report('resources.pages count', config.resources?.pages?.length ?? 0);
report('resources.menus count', config.resources?.menus?.length ?? 0);
assert(config.resources?.settings !== undefined, 'resources.settings present');
assert((config.resources?.sections?.length ?? 0) > 0, 'sections present');

// ---------------------------------------------------------------------------
// 7. CRITICAL FAILURE RULE
// ---------------------------------------------------------------------------
console.log('\n## 7. CRITICAL FAILURE RULE');
const hasBistro = /modern\s*bistro/i.test(fullText) || /\bbistro\b/i.test(fullText);
const hasRestaurant = /restaurant/i.test(fullText);
if (hasBistro || hasRestaurant) {
  console.error('\n  FAIL  DATA STILL CHANGES BEFORE RENDERING — restaurant/bistro content present.');
  console.error('  Trace the FIRST boundary where the counseling input becomes restaurant data.');
  process.exit(1);
}
console.log('  PASS  No Modern Bistro / bistro / restaurant content in generated ThemeConfig.');

console.log(`\n# Result: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
