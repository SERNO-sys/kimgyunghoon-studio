/**
 * AWIE V2 - Phase 15.5: Commerce Plugin - Contribution Contract tests.
 *
 * These tests prove the Commerce Plugin is a DOMAIN FEATURE, NOT an
 * architectural exception. It contributes through the EXISTING generic
 * FeatureRecord contract and is consumed by the UNMODIFIED
 * DefaultCompositionService.
 *
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008):
 *   1. The Commerce Plugin does NOT create new SPIs, new Readers, or new
 *      Composition logic.
 *   2. The Commerce Plugin does NOT define new execution contexts and does
 *      NOT bypass the Composer.
 *   3. The UNMODIFIED DefaultCompositionService deterministically merges the
 *      FeatureRecord<CommercePluginConfig> into the final ThemeConfig:
 *        - FeatureRecord.config  -> ThemeConfig.resources.settings
 *        - FeatureRecord.seo.jsonLd -> ThemeConfig.seo.jsonLd (Product schema)
 *
 * CRITICAL CONSTITUTIONAL RULE (LEVEL-A): COMMERCIAL STATE SEPARATION
 * (PRICE IS LIVE BUSINESS STATE):
 *   - The Commerce Plugin contributes ONLY static catalog UI configuration
 *     (productGalleryStyle, enableReviews, maxVariantsDisplay).
 *   - It MUST NOT contribute price, inventory, promotions, cart, or checkout
 *     state to the ThemeConfig.
 *   - Pricing is dynamic (per user / locale / promotion) and is resolved by
 *     the Application layer AFTER the initial render.
 *
 * Run with: npx tsx src/cms/plugins/commerce/CommercePlugin.test.ts
 */

import { DefaultCompositionService } from '../../core/resolvers/DefaultCompositionService';
import type {
  IStructureReader,
  IPresentationReader,
  ILocalizationReader,
  IFeatureReader,
  StructureRecord,
  PresentationRecord,
  LocalizationRecord,
  FeatureRecord,
} from '../../core/resolvers/types';
import type { ThemeConfig } from '../../../lib/theme-config/v2/types';
import { COMMERCE_PLUGIN_ID, type CommercePluginConfig } from './types';

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
// Fixtures
// ---------------------------------------------------------------------------

/**
 * A high-fidelity CommercePluginConfig carrying STATIC catalog UI
 * configuration. It deliberately contains NO commercial state.
 */
function createCommerceConfig(): CommercePluginConfig {
  return {
    productGalleryStyle: 'grid',
    enableReviews: true,
    maxVariantsDisplay: 4,
  };
}

/**
 * The Product JSON-LD structured data payload contributed via
 * FeatureRecord.seo.jsonLd. This is the STATIC structural part of the Product
 * schema. It deliberately carries NO dynamic live pricing.
 */
function createProductJsonLd(): unknown[] {
  return [
    {
      type: 'Product',
      data: {
        name: 'Handcrafted Ceramic Vase',
        description: 'A hand-thrown ceramic vase with a matte glaze.',
        brand: { '@type': 'Brand', name: 'Studio Ceramics' },
        image: ['https://cdn.example.com/vase-1.jpg'],
        sku: 'CER-VASE-001',
        category: 'Home & Garden',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '127',
        },
      },
    },
  ];
}

/**
 * Builds the four Readers. The FeatureReader returns a
 * FeatureRecord<CommercePluginConfig> carrying the Commerce Plugin's
 * contribution.
 */
function createReaders(): {
  structureReader: IStructureReader;
  presentationReader: IPresentationReader;
  localizationReader: ILocalizationReader;
  featureReader: IFeatureReader<CommercePluginConfig>;
} {
  const structure: StructureRecord = {
    id: 'structure-1',
    blueprint: {
      pages: [{ id: 'home', route: '/', sectionIds: ['catalog'] }],
      sections: [{ id: 'catalog', type: 'catalog', content: { title: 'Shop' } }],
      menus: [],
      forms: [],
    },
  };

  const presentation: PresentationRecord = {
    id: 'presentation-1',
    asset: {
      domain: 'shop.example.com',
      favicon: 'favicon.ico',
      logo: 'logo.png',
      assets: [],
      primaryColor: '#1a2e1a',
    },
  };

  const localization: LocalizationRecord = {
    id: 'localization-1',
    locale: 'ko-KR',
    resolvedRevision: 3,
    content: {
      title: 'Studio Ceramics',
      tagline: 'Handcrafted goods',
      description: 'A ceramics studio',
    },
  };

  // The Commerce Plugin contributes through the EXISTING generic
  // FeatureRecord contract. This is a domain feature, NOT an architectural
  // exception.
  const feature: FeatureRecord<CommercePluginConfig> = {
    pluginId: COMMERCE_PLUGIN_ID,
    config: createCommerceConfig(),
    seo: {
      jsonLd: createProductJsonLd(),
    },
  };

  return {
    structureReader: { read: async () => structure },
    presentationReader: { read: async () => presentation },
    localizationReader: { read: async () => localization },
    featureReader: { read: async () => feature },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  section('The Commerce Plugin contributes through the EXISTING FeatureRecord contract');
  {
    const readers = createReaders();
    const feature = await readers.featureReader.read('project-1');

    // The FeatureRecord is generic over CommercePluginConfig.
    assert(feature.pluginId === COMMERCE_PLUGIN_ID, 'pluginId identifies the Commerce Plugin');
    assert(feature.config.productGalleryStyle === 'grid', 'productGalleryStyle is carried in config');
    assert(feature.config.enableReviews === true, 'enableReviews is carried in config');
    assert(feature.config.maxVariantsDisplay === 4, 'maxVariantsDisplay is carried in config');

    // NO COMMERCIAL STATE: the config carries only static catalog UI values.
    const configKeys = Object.keys(feature.config);
    assert(!configKeys.includes('price'), 'NO price live state in config');
    assert(!configKeys.includes('priceRange'), 'NO priceRange live state in config');
    assert(!configKeys.includes('currency'), 'NO currency live state in config');
    assert(!configKeys.includes('stock'), 'NO stock live state in config');
    assert(!configKeys.includes('inventory'), 'NO inventory live state in config');
    assert(!configKeys.includes('cart'), 'NO cart live state in config');
    assert(!configKeys.includes('checkout'), 'NO checkout live state in config');

    const firstNode = feature.seo?.jsonLd?.[0] as Record<string, unknown> | undefined;
    assert(firstNode?.['type'] === 'Product', 'Product JSON-LD is contributed');
  }

  section('The UNMODIFIED DefaultCompositionService merges CommercePluginConfig into ThemeConfig.resources.settings');
  {
    const readers = createReaders();
    const service = new DefaultCompositionService(
      readers.structureReader,
      readers.presentationReader,
      readers.localizationReader,
      readers.featureReader,
    );

    const config: ThemeConfig = await service.compose({ projectId: 'project-1' });

    // The Composer's readSettings merge folds FeatureRecord.config into
    // ThemeConfig.resources.settings. The static catalog config is
    // deterministically merged.
    const settings = config.resources.settings as Record<string, unknown>;
    assert(settings['productGalleryStyle'] === 'grid', 'productGalleryStyle is merged into settings');
    assert(settings['enableReviews'] === true, 'enableReviews is merged into settings');
    assert(settings['maxVariantsDisplay'] === 4, 'maxVariantsDisplay is merged into settings');

    // NO COMMERCIAL STATE leaks into the ThemeConfig.
    assert(!('price' in settings), 'NO price live state in ThemeConfig');
    assert(!('priceRange' in settings), 'NO priceRange live state in ThemeConfig');
    assert(!('currency' in settings), 'NO currency live state in ThemeConfig');
    assert(!('stock' in settings), 'NO stock live state in ThemeConfig');
    assert(!('inventory' in settings), 'NO inventory live state in ThemeConfig');
    assert(!('cart' in settings), 'NO cart live state in ThemeConfig');
    assert(!('checkout' in settings), 'NO checkout live state in ThemeConfig');
  }

  section('The UNMODIFIED DefaultCompositionService merges Product JSON-LD into ThemeConfig.seo.jsonLd');
  {
    const readers = createReaders();
    const service = new DefaultCompositionService(
      readers.structureReader,
      readers.presentationReader,
      readers.localizationReader,
      readers.featureReader,
    );

    const config: ThemeConfig = await service.compose({ projectId: 'project-1' });

    // The Composer's concatJsonLd merge folds FeatureRecord.seo.jsonLd into
    // ThemeConfig.seo.jsonLd. The Product structured data is deterministically
    // merged.
    assert(config.seo?.jsonLd?.length === 1, 'Product JSON-LD is merged into seo.jsonLd');
    assert(config.seo?.jsonLd?.[0]?.type === 'Product', 'JSON-LD type is Product');
    const data = config.seo?.jsonLd?.[0]?.data as Record<string, unknown>;
    assert(data['name'] === 'Handcrafted Ceramic Vase', 'Product name is preserved');
    assert(data['sku'] === 'CER-VASE-001', 'Product sku is preserved');
    assert(data['category'] === 'Home & Garden', 'Product category is preserved');

    // The static Product JSON-LD carries NO dynamic live pricing.
    assert(!('offers' in data), 'NO offers (price) in static Product JSON-LD');
    assert(!('price' in data), 'NO price in static Product JSON-LD');
  }

  section('The Commerce Plugin does NOT bypass the Composer (no ThemeConfig produced by the plugin)');
  {
    // The Commerce Plugin contributes ONLY passive data through FeatureRecord.
    // It NEVER produces a ThemeConfig. The Composer remains the SOLE
    // ORCHESTRATOR. This is proven by the fact that the final ThemeConfig is
    // produced entirely by the UNMODIFIED DefaultCompositionService.
    const readers = createReaders();
    const service = new DefaultCompositionService(
      readers.structureReader,
      readers.presentationReader,
      readers.localizationReader,
      readers.featureReader,
    );

    const config: ThemeConfig = await service.compose({ projectId: 'project-1' });

    // The ThemeConfig is a standard execution contract.
    assert(config.metadata.generator === 'awie-cms-composition', 'generator is the standard composition generator');
    assert(config.metadata.generatorVersion === '2.0.0', 'generator version is standard');
    assert(config.metadata.title === 'Studio Ceramics', 'title is composed from localization');
    assert(config.metadata.locale === 'ko-KR', 'locale is composed from localization');
    assert(config.resources.pages.length === 1, 'pages are composed from structure');
    assert(config.resources.sections.length === 1, 'sections are composed from structure');
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
