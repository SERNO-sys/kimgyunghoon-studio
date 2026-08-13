/**
 * AWIE Design Intelligence — E2E validation.
 *
 * Runs the full BrainGoldenPath pipeline (AWIE Brain → Design Intelligence →
 * ThemeConfig Bridge → Renderer-facing ThemeConfig) against the 5 test
 * businesses from the FINAL IMPLEMENTATION spec.
 *
 * Verifies that different businesses produce STRUCTURALLY different designs
 * (not just different colors).
 */
import { BrainGoldenPath } from '../src/lib/golden-path/brain-pipeline';
import { buildVisualDesignDecision } from '../src/lib/design-intelligence';

const TEST_BUSINESSES = [
  '부산 해운대 20년 수제 타르트 전문점',
  '해운대 프리미엄 요가원',
  '개인 사진작가 포트폴리오',
  '전문 서비스 사업',
  '지역 공방',
];

async function run() {
  const pipeline = new BrainGoldenPath();
  const results: Array<{ input: string; summary: unknown; ok: boolean }> = [];

  for (const input of TEST_BUSINESSES) {
    const result = await pipeline.run(input);
    if (!result.ok) {
      results.push({ input, ok: false, summary: result.error });
      continue;
    }

    // Design Intelligence consumes the Brain outputs (WHAT) → VisualDesignDecision (HOW).
    const decision = buildVisualDesignDecision({
      businessMeaning: result.meaning,
      decisionPlan: result.plan,
      contentPlan: result.contentPlan,
    });

    // The ThemeConfig Bridge writes the decision into the renderer-facing config.
    const merged = await pipeline.execute(result);


    results.push({
      input,
      ok: true,
      summary: {
        decision: {
          archetype: decision.primaryArchetype,
          hero: decision.heroVariant,
          density: decision.density,
          spacing: decision.spacing,
          cta: decision.ctaPriority,
          image: decision.imageTreatment,
          sectionOrder: decision.sections.map((s) => s.type),
          sectionVariants: decision.sections.map((s) => s.variant),
          rationale: decision.rationale,
        },
        themeConfig: {
          designArchetype: (merged.config as { resources?: { settings?: { design?: { primaryArchetype?: string } } } } | undefined)?.resources?.settings?.design?.primaryArchetype,
          heroVariant: (merged.config as { resources?: { settings?: { skeleton?: { heroType?: string } } } } | undefined)?.resources?.settings?.skeleton?.heroType,
          paletteToken: (merged.config as { resources?: { settings?: { skin?: { colorPalette?: string } } } } | undefined)?.resources?.settings?.skin?.colorPalette,
          fontToken: (merged.config as { resources?: { settings?: { skin?: { fontPairing?: string } } } } | undefined)?.resources?.settings?.skin?.fontPairing,
          menuItems: (merged.config as { resources?: { menus?: { items?: { label: string }[] }[] } } | undefined)?.resources?.menus?.[0]?.items?.map((i) => i.label),
          pageCount: (merged.config as { resources?: { pages?: unknown[] } } | undefined)?.resources?.pages?.length,
          decisions: merged.decisions,
        },

      },
    });
  }

  console.log('=== AWIE Design Intelligence E2E ===\n');
  for (const r of results) {
    console.log(`INPUT: ${r.input}`);
    console.log(JSON.stringify(r.summary, null, 2));
    console.log('----------------------------------------\n');
  }

  // Structural difference check: collect archetype + hero + section order.
  const signatures = results
    .filter((r) => r.ok)
    .map((r) => {
      const s = r.summary as {
        decision: { archetype: string; hero: string; sectionOrder: string[] };
      };
      return `${s.decision.archetype}|${s.decision.hero}|${s.decision.sectionOrder.join(',')}`;
    });

  const unique = new Set(signatures);
  console.log(`\n=== STRUCTURAL DIFFERENCE CHECK ===`);
  console.log(`Unique structural signatures: ${unique.size} / ${signatures.length}`);
  if (unique.size < 2) {
    console.log('FAIL: All businesses produced the same structure (only color differs).');
    process.exit(1);
  }
  console.log('PASS: Businesses produce structurally different designs.');
}

run();
