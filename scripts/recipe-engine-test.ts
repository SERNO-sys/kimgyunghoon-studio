/**
 * AWIE V2 - Recipe Engine smoke test.
 *
 * Mocks a BusinessBrief and a Restaurant profile, feeds them to the engine,
 * selects the Modern Bistro recipe, resolves priorities, and outputs a valid
 * mock ThemeConfig.
 *
 * Run: npx tsx scripts/recipe-engine-test.ts
 */

import {
  Feature,
  RecipeRegistry,
  RecipeSelector,
  RecipeMerger,
  MODERN_BISTRO_RECIPE,
} from '../src/lib/recipe-engine';

import { RESTAURANT_PROFILE } from '../src/lib/industry-registry';
import { createEmptyBrief } from '../src/lib/question-engine/brief';

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean): void {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Setup: registry + selector + merger
// ---------------------------------------------------------------------------
const registry = new RecipeRegistry();
registry.register(MODERN_BISTRO_RECIPE);

const selector = new RecipeSelector(registry);
const merger = new RecipeMerger();

// ---------------------------------------------------------------------------
// Mock BusinessBrief (partially filled, as from the Question Engine)
// ---------------------------------------------------------------------------
const brief = createEmptyBrief();
brief.businessType = { primary: 'restaurant', secondary: ['bistro'] };
brief.goals = { primary: 'conversion', additional: ['attract_diners'] };
brief.personality = { tone: 'premium', values: ['craft', 'local'] };
brief.services = { items: ['seasonal menu', 'reservations'] };
brief.contactPreference = { channel: 'phone', value: '+82-2-1234-5678' };

// ---------------------------------------------------------------------------
// 1. Registry
// ---------------------------------------------------------------------------
console.log('=== Registry ===');
check('R1: registry has 1 recipe', registry.size === 1);
check('R2: get("modern-bistro") returns recipe', registry.get('modern-bistro')?.recipeId === 'modern-bistro');
check('R3: match("restaurant") returns 1 recipe', registry.match('restaurant').length === 1);
check('R4: match("law_firm") returns 0 recipes', registry.match('law_firm').length === 0);

// ---------------------------------------------------------------------------
// 2. Selector
// ---------------------------------------------------------------------------
console.log('\n=== Selector ===');
const selection = selector.select(RESTAURANT_PROFILE);
check('S1: selects modern-bistro', selection.recipe?.recipeId === 'modern-bistro');
check('S2: score > 0', selection.score > 0);
check('S3: candidates length 1', selection.candidates.length === 1);

// ---------------------------------------------------------------------------
// 3. Merger (no user preferences -> recipe defaults win)
// ---------------------------------------------------------------------------
console.log('\n=== Merger (recipe defaults) ===');
const result = merger.merge({
  recipe: selection.recipe!,
  industryProfile: RESTAURANT_PROFILE,
  brief,
});

const config = result.config;
check('M1: title from recipe default', config.metadata.title === 'Modern Bistro');
check('M2: intent from BusinessBrief (conversion)', config.intent === 'conversion');
check('M3: skin colorPalette is dark (#111827)', config.resources.settings.skin?.colorPalette === '#111827');
check('M4: typography font is serif', config.resources.settings.skin?.fontPairing === 'serif');
check('M5: supportsMenu mapped to a features section', config.resources.sections.some((s) => s.id === 'menu' && s.type === 'features'));

check('M6: requiresContactForm satisfied (contact section)', config.resources.sections.some((s) => s.type === 'contact'));
check('M7: requiresAddress satisfied (text section)', config.resources.sections.some((s) => s.type === 'text'));
check('M8: requiresOpeningHours satisfied (text section)', config.resources.sections.some((s) => s.type === 'text'));

check('M9: every section referenced by a page', config.resources.pages.every((p) => p.sectionIds.every((id) => config.resources.sections.some((s) => s.id === id))));
check('M10: no warnings (all requirements mapped)', result.warnings.length === 0);
check('M11: decisions recorded', result.decisions.length > 0);
check('M12: valid ThemeConfig root (metadata/resources/policies)', !!config.metadata && !!config.resources && !!config.policies);

// ---------------------------------------------------------------------------
// 4. Merger with user preferences (highest priority wins)
// ---------------------------------------------------------------------------
console.log('\n=== Merger (user preferences override) ===');
const result2 = merger.merge({
  recipe: selection.recipe!,
  industryProfile: RESTAURANT_PROFILE,
  brief,
  userPreferences: {
    title: 'My Custom Bistro',
    primaryColor: '#0f766e',
    font: 'sans',
  },
});
const config2 = result2.config;
check('U1: user title wins', config2.metadata.title === 'My Custom Bistro');
check('U2: user primaryColor wins', config2.resources.settings.primaryColor === '#0f766e');
check('U3: user font wins', config2.resources.settings.font === 'sans');
check('U4: decision recorded for title', result2.decisions.some((d) => d.includes('title: user applied')));


// ---------------------------------------------------------------------------
// 5. Requirement fulfillment: recipe missing a required capability
// ---------------------------------------------------------------------------
console.log('\n=== Requirement fulfillment (missing capability) ===');
// Simulate a recipe that does NOT map the "contact" feature (from
// requiresContactForm) and provides no contact section at all.
const incompleteRecipe = {
  ...MODERN_BISTRO_RECIPE,
  recipeId: 'incomplete-bistro',
  mapping: {
    ...MODERN_BISTRO_RECIPE.mapping,
    capabilityFeatures: MODERN_BISTRO_RECIPE.mapping.capabilityFeatures.filter(
      (m) => m.capability !== 'requiresContactForm',
    ),
    sectionMappings: MODERN_BISTRO_RECIPE.mapping.sectionMappings.filter(
      (m) => m.feature !== Feature.Contact,
    ),

  },
  content: {
    ...MODERN_BISTRO_RECIPE.content,
    sections: MODERN_BISTRO_RECIPE.content.sections.filter(
      (s) => s.type !== 'contact',
    ),
  },
};

const registry2 = new RecipeRegistry();
registry2.register(incompleteRecipe);
const selector2 = new RecipeSelector(registry2);
const selection2 = selector2.select(RESTAURANT_PROFILE);
const result3 = merger.merge({
  recipe: selection2.recipe!,
  industryProfile: RESTAURANT_PROFILE,
  brief,
});
check('F1: warning emitted for missing requiresContactForm capability', result3.warnings.some((w) => w.includes('requiresContactForm')));
check('F2: default contact section injected', result3.config.resources.sections.some((s) => s.id === 'requiresContactForm' && s.type === 'contact'));



// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------
console.log('\n========================================');
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
