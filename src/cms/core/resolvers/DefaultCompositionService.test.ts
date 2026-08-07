/**
 * AWIE V2 - Phase 14.7: Global SEO - DefaultCompositionService tests.
 *
 * These tests prove that the Composition Service deterministically merges
 * Global SEO, Local SEO, and Plugin-contributed SEO into ThemeConfig.seo.
 *
 * CRITICAL ARCHITECTURE RULE (SEO IS PRESENTATION):
 * The Composer MUST NOT decide fallback policies (e.g. "if local SEO is
 * missing, use global"). Fallback is an Application Layer business rule
 * resolved BEFORE the Composition Boundary. The Composer simply assembles the
 * provided read models.
 *
 * The tests therefore assert:
 *   1. Global SEO is assembled into ThemeConfig.seo.
 *   2. Local SEO overrides Global SEO via a FIXED, deterministic precedence
 *      (a pure assembly rule, NOT a runtime fallback decision).
 *   3. Plugin-contributed JSON-LD is concatenated into ThemeConfig.seo.jsonLd.
 *   4. When a source is absent, the Composer does NOT invent a fallback — it
 *      simply assembles what was provided.
 *
 * Run with: npx tsx src/cms/core/resolvers/DefaultCompositionService.test.ts
 */

import { DefaultCompositionService } from './DefaultCompositionService';
import type {
  IStructureReader,
  IPresentationReader,
  ILocalizationReader,
  IFeatureReader,
  StructureRecord,
  PresentationRecord,
  LocalizationRecord,
  FeatureRecord,
} from './types';
import type { ThemeConfig } from '../../../lib/theme-config/v2/types';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`  FAIL: ${message}`);
  }
}

function section(title: string): void {
  console.log(`\n[${title}]`);
}

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

function createReaders(overrides: {
  structure?: Partial<StructureRecord>;
  presentation?: Partial<PresentationRecord>;
  localization?: Partial<LocalizationRecord>;
  feature?: Partial<FeatureRecord>;
}): {
  structureReader: IStructureReader;
  presentationReader: IPresentationReader;
  localizationReader: ILocalizationReader;
  featureReader: IFeatureReader;
} {
  const structure: StructureRecord = {
    id: 'structure-1',
    blueprint: {
      pages: [],
      sections: [],
      menus: [],
      forms: [],
    },
    ...overrides.structure,
  };

  const presentation: PresentationRecord = {
    id: 'presentation-1',
    asset: {
      domain: 'example.com',
      favicon: 'favicon.ico',
      logo: 'logo.png',
      assets: [],
    },
    ...overrides.presentation,
  };

  const localization: LocalizationRecord = {
    id: 'localization-1',
    locale: 'ko-KR',
    resolvedRevision: 3,
    content: {
      title: 'Example Site',
      tagline: 'A tagline',
      description: 'A description',
    },
    ...overrides.localization,
  };

  const feature: FeatureRecord = {
    pluginId: 'feature-1',
    config: {},
    ...overrides.feature,
  };

  return {
    structureReader: { read: async () => structure },
    presentationReader: { read: async () => presentation },
    localizationReader: { read: async () => localization },
    featureReader: { read: async () => feature },
  };
}

async function compose(
  overrides: Parameters<typeof createReaders>[0],
): Promise<ThemeConfig> {
  const readers = createReaders(overrides);
  const service = new DefaultCompositionService(
    readers.structureReader,
    readers.presentationReader,
    readers.localizationReader,
    readers.featureReader,
  );
  return service.compose({ projectId: 'project-1' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  section('Global SEO is assembled into ThemeConfig.seo');
  {
    const config = await compose({
      presentation: {
        globalSeo: {
          canonical: 'https://example.com/',
          robots: 'index,follow',
          openGraph: {
            title: 'Global OG Title',
            description: 'Global OG Description',
            type: 'website',
            image: 'https://example.com/og.png',
            url: 'https://example.com/',
            siteName: 'Example',
            locale: 'en_US',
          },
          twitter: {
            card: 'summary_large_image',
            site: '@example',
            title: 'Global Twitter Title',
          },
          jsonLd: [{ type: 'Organization', data: { name: 'Example Org' } }],
        },
      },
    });

    assert(config.seo !== undefined, 'seo node is defined');
    assert(config.seo?.canonical === 'https://example.com/', 'canonical is assembled');
    assert(config.seo?.robots === 'index,follow', 'robots is assembled');
    assert(config.seo?.openGraph?.title === 'Global OG Title', 'OG title is assembled');
    assert(config.seo?.openGraph?.type === 'website', 'OG type is assembled');
    assert(config.seo?.twitter?.card === 'summary_large_image', 'Twitter card is assembled');
    assert(config.seo?.jsonLd?.length === 1, 'Global JSON-LD is assembled');
    assert(
      config.seo?.jsonLd?.[0]?.type === 'Organization',
      'Global JSON-LD type is preserved',
    );
  }

  section('Local SEO overrides Global SEO (fixed precedence)');
  {
    const config = await compose({
      presentation: {
        globalSeo: {
          canonical: 'https://example.com/',
          robots: 'index,follow',
        },
      },
      localization: {
        localSeo: {
          canonical: 'https://example.com/ko-KR/',
          robots: 'noindex',
        },
      },
    });

    assert(
      config.seo?.canonical === 'https://example.com/ko-KR/',
      'Local canonical overrides Global canonical',
    );
    assert(config.seo?.robots === 'noindex', 'Local robots overrides Global robots');
  }

  section('OpenGraph merge: Local overrides Global, Global fills the rest');
  {
    const config = await compose({
      presentation: {
        globalSeo: {
          openGraph: {
            title: 'Global OG Title',
            description: 'Global OG Description',
            type: 'website',
            image: 'https://example.com/og.png',
            url: 'https://example.com/',
            siteName: 'Example',
            locale: 'en_US',
          },
        },
      },
      localization: {
        localSeo: {
          openGraph: {
            title: 'Local OG Title',
            locale: 'ko_KR',
          },
        },
      },
    });

    assert(config.seo?.openGraph?.title === 'Local OG Title', 'Local OG title wins');
    assert(config.seo?.openGraph?.locale === 'ko_KR', 'Local OG locale wins');
    assert(
      config.seo?.openGraph?.description === 'Global OG Description',
      'Global OG description fills the rest',
    );
    assert(config.seo?.openGraph?.type === 'website', 'Global OG type fills the rest');
  }

  section('Twitter merge: Local overrides Global, Global fills the rest');
  {
    const config = await compose({
      presentation: {
        globalSeo: {
          twitter: {
            card: 'summary_large_image',
            site: '@example',
            title: 'Global Twitter Title',
          },
        },
      },
      localization: {
        localSeo: {
          twitter: {
            title: 'Local Twitter Title',
          },
        },
      },
    });

    assert(config.seo?.twitter?.title === 'Local Twitter Title', 'Local Twitter title wins');
    assert(config.seo?.twitter?.card === 'summary_large_image', 'Global Twitter card fills the rest');
    assert(config.seo?.twitter?.site === '@example', 'Global Twitter site fills the rest');
  }

  section('Plugin-contributed JSON-LD is concatenated (Global -> Local -> Plugin)');
  {
    const config = await compose({
      presentation: {
        globalSeo: {
          jsonLd: [{ type: 'Organization', data: { name: 'Example Org' } }],
        },
      },
      localization: {
        localSeo: {
          jsonLd: [{ type: 'WebSite', data: { name: 'Example Site' } }],
        },
      },
      feature: {
        seo: {
          jsonLd: [
            { type: 'Product', data: { name: 'Widget', price: '19.99' } },
            { type: 'MusicRecording', data: { name: 'Track One' } },
          ],
        },
      },
    });

    assert(config.seo?.jsonLd?.length === 4, 'All JSON-LD nodes are concatenated');
    assert(config.seo?.jsonLd?.[0]?.type === 'Organization', 'Global JSON-LD first');
    assert(config.seo?.jsonLd?.[1]?.type === 'WebSite', 'Local JSON-LD second');
    assert(config.seo?.jsonLd?.[2]?.type === 'Product', 'Plugin JSON-LD third');
    assert(config.seo?.jsonLd?.[3]?.type === 'MusicRecording', 'Plugin JSON-LD fourth');
    assert(
      config.seo?.jsonLd?.[2]?.data?.name === 'Widget',
      'Plugin JSON-LD data is preserved',
    );
  }

  section('NO internal fallback logic');
  {
    // Only Global SEO provided. The Composer must NOT decide to "fall back" to
    // Global for a missing Local — it simply assembles what was provided.
    const onlyGlobal = await compose({
      presentation: {
        globalSeo: {
          canonical: 'https://example.com/',
          openGraph: { title: 'Global OG Title' },
        },
      },
    });
    assert(onlyGlobal.seo?.canonical === 'https://example.com/', 'Global-only canonical assembled');
    assert(onlyGlobal.seo?.openGraph?.title === 'Global OG Title', 'Global-only OG assembled');

    // Only Local SEO provided. The Composer assembles it as-is.
    const onlyLocal = await compose({
      localization: {
        localSeo: {
          canonical: 'https://example.com/ko-KR/',
          openGraph: { title: 'Local OG Title' },
        },
      },
    });
    assert(onlyLocal.seo?.canonical === 'https://example.com/ko-KR/', 'Local-only canonical assembled');
    assert(onlyLocal.seo?.openGraph?.title === 'Local OG Title', 'Local-only OG assembled');

    // No SEO source provided. The Composer must NOT invent defaults.
    const none = await compose({});
    assert(none.seo !== undefined, 'seo node is defined even when empty');
    assert(none.seo?.canonical === undefined, 'no invented canonical');
    assert(none.seo?.robots === undefined, 'no invented robots');
    assert(none.seo?.openGraph === undefined, 'no invented openGraph');
    assert(none.seo?.twitter === undefined, 'no invented twitter');
    assert(none.seo?.jsonLd === undefined, 'no invented jsonLd');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
