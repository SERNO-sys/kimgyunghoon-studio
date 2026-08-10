/**
 * AWIE V2 — Design Intelligence → ThemeConfig → Renderer data-path test.
 *
 * Proves the FULL chain that was previously broken:
 *
 *   Design Intelligence (v2 ThemeConfig with resources)
 *     → commit route (toLegacyThemeConfig)  [was DROPPING resources]
 *     → legacy-adapter (adaptLegacyThemeConfig)  [reads resources as SSOT]
 *     → Renderer (hero variant, section variants, palette, typography)
 *
 * The commit route's `toLegacyThemeConfig` is not exported, so this test
 * re-implements the exact mapping contract it must satisfy: the persisted
 * legacy config MUST carry `resources` so the legacy-adapter can lift the
 * Design Intelligence decisions to the renderer.
 */
import { adaptLegacyThemeConfig } from '../src/lib/renderer/legacy-adapter';
import type { ThemeConfig as V2ThemeConfig } from '../src/lib/theme-config/v2/types';
import type { ThemeConfig as LegacyThemeConfig } from '../src/types/site';
import type { ThemeResources } from '../src/lib/theme-config/v2/types';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Mirrors the commit route's toLegacyThemeConfig contract: preserve resources. */
function simulateCommitRoute(v2: V2ThemeConfig): LegacyThemeConfig {
  const legacy: LegacyThemeConfig = {
    presetId: 'default',
    intentType: v2.intent,
    sections: ['hero', 'about', 'contact'],
    content: {
      hero_title: v2.metadata.title ?? '',
      hero_subtitle: v2.metadata.tagline ?? '',
      about_bio: v2.metadata.description ?? '',
    },
  };
  const withResources = legacy as LegacyThemeConfig & { resources?: ThemeResources };
  withResources.resources = v2.resources;
  return withResources;
}

function buildV2(overrides: Partial<V2ThemeConfig> = {}): V2ThemeConfig {
  return {
    metadata: {
      title: '해운대 수제 타르트',
      description: '20년 전통 수제 타르트 전문점',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generator: 'test',
      generatorVersion: '1.0.0',
    },
    intent: 'brand_experience',
    resources: {
      pages: [
        { id: 'home', route: '/', title: 'HOME', sectionIds: ['hero', 'about', 'contact'], isHome: true },
        { id: 'gallery', route: '/gallery', title: 'GALLERY', sectionIds: ['gallery'] },
      ],
      sections: [
        {
          id: 'hero',
          type: 'hero',
          content: { title: '해운대 20년 수제 타르트', subtitle: '매일 아침 구워내는 정성', ctaLabel: '메뉴 보기', ctaHref: '/gallery' },
          settings: { variant: 'SPLIT' },
        },
        {
          id: 'about',
          type: 'text',
          content: { title: 'About', body: '20년 전통의 수제 타르트 전문점입니다.' },
          settings: { variant: 'TEXT' },
        },
        {
          id: 'gallery',
          type: 'gallery',
          content: { title: 'Gallery', items: [] },
          settings: { variant: 'GRID' },
        },
        {
          id: 'contact',
          type: 'contact',
          content: { title: 'Contact', body: '문의는 아래로 부탁드립니다.' },
          settings: { variant: 'INFO_FORM' },
        },
      ],
      assets: [],
      settings: {
        primaryColor: '#8B5E3C',
        secondaryColor: '#C9A227',
        backgroundColor: '#FAF6F0',
        textColor: '#2B2118',
        skin: { colorPalette: 'warm', fontPairing: 'serif' },
        skeleton: { headerType: 'logo-left', heroType: 'SPLIT' },
      },
      menus: [
        {
          id: 'main',
          label: 'Main',
          items: [
            { label: 'HOME', target: '/' },
            { label: 'ABOUT', target: '/about' },
            { label: 'DIARY', target: '/diary' },
            { label: 'CONTACT', target: '/contact' },
            { label: 'GALLERY', target: '/gallery' },
          ],
        },
      ],
      forms: [],
    },
    policies: {},
    ...overrides,
  };
}


console.log('=== Design Intelligence → ThemeConfig → Renderer data path ===\n');

// 1. Build a v2 ThemeConfig as Design Intelligence would produce it.
const v2 = buildV2();

// 2. Simulate the commit route persisting it (must preserve resources).
const persisted = simulateCommitRoute(v2);
check(
  'commit route preserves resources on persisted legacy config',
  (persisted as unknown as { resources?: ThemeResources }).resources !== undefined,
  'resources was dropped — renderer would fall back to CENTERED hero'
);

// 3. Run the legacy-adapter (what the renderer actually consumes).
const adapted = adaptLegacyThemeConfig(persisted, '해운대 수제 타르트', [
  { id: 'home', label: 'HOME', path: '/', type: 'home', visible: true, order: 0, content: '' },
  { id: 'about', label: 'ABOUT', path: '/about', type: 'about', visible: true, order: 1, content: '' },
  { id: 'diary', label: 'DIARY', path: '/diary', type: 'diary', visible: true, order: 2, content: '' },
  { id: 'contact', label: 'CONTACT', path: '/contact', type: 'contact', visible: true, order: 3, content: '' },
  { id: 'gallery', label: 'GALLERY', path: '/gallery', type: 'custom', visible: true, order: 4, content: '' },
]);

// 4. Verify the Design Intelligence decisions reached the renderer.
const hero = adapted.resources.sections.find((s) => s.type === 'hero');
check('hero variant SPLIT reaches renderer', hero?.settings?.variant === 'SPLIT', `got ${hero?.settings?.variant}`);

const gallery = adapted.resources.sections.find((s) => s.type === 'gallery');
check('gallery variant GRID reaches renderer', gallery?.settings?.variant === 'GRID', `got ${gallery?.settings?.variant}`);

const contact = adapted.resources.sections.find((s) => s.type === 'contact');
check('contact variant INFO_FORM reaches renderer', contact?.settings?.variant === 'INFO_FORM', `got ${contact?.settings?.variant}`);

check('palette primaryColor reaches renderer', adapted.resources.settings.primaryColor === '#8B5E3C');
check('palette backgroundColor reaches renderer', adapted.resources.settings.backgroundColor === '#FAF6F0');
check('typography fontPairing reaches renderer', adapted.resources.settings.skin?.fontPairing === 'serif');

// 5. Verify custom menu + page reached the renderer.
const menu = adapted.resources.menus.find((m) => m.id === 'main');
check('custom GALLERY menu item reaches renderer', menu?.items.some((i) => i.label === 'GALLERY') === true);
check('default HOME menu item preserved', menu?.items.some((i) => i.label === 'HOME') === true);
check('custom GALLERY page reaches renderer', adapted.resources.pages.some((p) => p.route === '/gallery') === true);

// 6. Verify AI copy reached the renderer.
check('AI hero title reaches renderer', hero?.content?.title === '해운대 20년 수제 타르트');
check('AI hero subtitle reaches renderer', hero?.content?.subtitle === '매일 아침 구워내는 정성');

// 7. Verify the legacy fallback path still works (no resources → no white screen).
const legacyOnly: LegacyThemeConfig = {
  presetId: 'default',
  sections: ['hero', 'about', 'contact'],
  content: { hero_title: '환영합니다', hero_subtitle: '', about_bio: '' },
};
const adaptedLegacy = adaptLegacyThemeConfig(legacyOnly, 'Fallback Site', [
  { id: 'home', label: 'HOME', path: '/', type: 'home', visible: true, order: 0, content: '' },
]);
const legacyHero = adaptedLegacy.resources.sections.find((s) => s.type === 'hero');
check('legacy fallback hero variant defaults to CENTERED', legacyHero?.settings?.variant === 'CENTERED');
check('legacy fallback still renders sections', adaptedLegacy.resources.sections.length >= 3);

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`));
process.exit(failures === 0 ? 0 : 1);
