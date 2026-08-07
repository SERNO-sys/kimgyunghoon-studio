/**
 * AWIE V2 - Phase 15.7: Analytics Plugin - Contribution Contract tests.
 *
 * These tests prove the Analytics Plugin is a DOMAIN FEATURE, NOT an
 * architectural exception. It contributes through the EXISTING generic
 * FeatureRecord contract and is consumed by the UNMODIFIED
 * DefaultCompositionService.
 *
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008):
 *   1. The Analytics Plugin does NOT create new SPIs, new Readers, or new
 *      Composition logic.
 *   2. The Analytics Plugin does NOT define new execution contexts and does
 *      NOT bypass the Composer.
 *   3. The UNMODIFIED DefaultCompositionService deterministically merges the
 *      FeatureRecord<AnalyticsPluginConfig> into the final ThemeConfig:
 *        - FeatureRecord.config -> ThemeConfig.resources.settings
 *
 * CRITICAL CONSTITUTIONAL RULE (LEVEL-A): OBSERVATION WITHOUT INFLUENCE
 * (ANALYTICS IS OUTBOUND-ONLY):
 *   "ThemeConfig contains only deterministic presentation contracts. Any
 *    live, user-specific, transactional, observational, or mutable state
 *    belongs to the Application layer."
 *   - The Analytics Plugin contributes ONLY static tracking config, consent
 *     UI, event schemas, and experiment definitions.
 *   - It MUST NOT contribute live states (consentState, currentVariant,
 *     visitorSession), experiment assignments, or analytics results.
 *   - The Composer and CompositionIdentity remain completely blind to which
 *     variant a user sees.
 *
 * Run with: npx tsx src/cms/plugins/analytics/AnalyticsPlugin.test.ts
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
import { ANALYTICS_PLUGIN_ID, type AnalyticsPluginConfig } from './types';

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
 * A high-fidelity AnalyticsPluginConfig carrying STATIC tracking config,
 * consent UI, event schemas, and experiment definitions. It deliberately
 * contains NO live states (consentState, currentVariant, visitorSession),
 * NO experiment assignments, and NO analytics results.
 */
function createAnalyticsConfig(): AnalyticsPluginConfig {
  return {
    trackingIds: ['UA-123456789-1', 'G-ABCDEF1234'],
    consentBannerStyle: 'banner',
    experimentDefinitions: [
      {
        id: 'exp-hero-headline',
        name: 'Hero Headline A/B Test',
        variants: ['control', 'variant-a', 'variant-b'],
      },
    ],
    eventSchemas: [
      { name: 'page_view', properties: ['path', 'referrer'] },
      { name: 'purchase', properties: ['orderId', 'total'] },
    ],
  };
}

/**
 * Builds the four Readers. The FeatureReader returns a
 * FeatureRecord<AnalyticsPluginConfig> carrying the Analytics Plugin's
 * contribution.
 */
function createReaders(): {
  structureReader: IStructureReader;
  presentationReader: IPresentationReader;
  localizationReader: ILocalizationReader;
  featureReader: IFeatureReader<AnalyticsPluginConfig>;
} {
  const structure: StructureRecord = {
    id: 'structure-1',
    blueprint: {
      pages: [{ id: 'home', route: '/', sectionIds: ['analytics'] }],
      sections: [{ id: 'analytics', type: 'analytics', content: { title: 'Analytics' } }],
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

  // The Analytics Plugin contributes through the EXISTING generic
  // FeatureRecord contract. This is a domain feature, NOT an architectural
  // exception.
  const feature: FeatureRecord<AnalyticsPluginConfig> = {
    pluginId: ANALYTICS_PLUGIN_ID,
    config: createAnalyticsConfig(),
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
  section('The Analytics Plugin contributes through the EXISTING FeatureRecord contract');
  {
    const readers = createReaders();
    const feature = await readers.featureReader.read('project-1');

    // The FeatureRecord is generic over AnalyticsPluginConfig.
    assert(feature.pluginId === ANALYTICS_PLUGIN_ID, 'pluginId identifies the Analytics Plugin');
    assert(feature.config.trackingIds.length === 2, 'trackingIds are carried in config');
    assert(feature.config.consentBannerStyle === 'banner', 'consentBannerStyle is carried in config');
    assert(feature.config.experimentDefinitions.length === 1, 'experimentDefinitions are carried in config');
    assert(feature.config.eventSchemas.length === 2, 'eventSchemas are carried in config');

    // NO LIVE STATES: the config carries only static tracking config, consent
    // UI, event schemas, and experiment definitions.
    const configKeys = Object.keys(feature.config);
    assert(!configKeys.includes('consentState'), 'NO consentState in config');
    assert(!configKeys.includes('consentAccepted'), 'NO consentAccepted in config');
    assert(!configKeys.includes('currentVariant'), 'NO currentVariant in config');
    assert(!configKeys.includes('assignedVariant'), 'NO assignedVariant in config');
    assert(!configKeys.includes('visitorSession'), 'NO visitorSession in config');
    assert(!configKeys.includes('sessionId'), 'NO sessionId in config');
    assert(!configKeys.includes('revenue'), 'NO revenue in config');
    assert(!configKeys.includes('pageViews'), 'NO pageViews in config');
    assert(!configKeys.includes('conversions'), 'NO conversions in config');

    // The experiment definitions carry only the DEFINITION (id, name,
    // variants), NOT the ASSIGNMENT.
    const experiment = feature.config.experimentDefinitions[0];
    assert(experiment.id === 'exp-hero-headline', 'experiment id is a definition');
    assert(experiment.variants.length === 3, 'experiment variants are a definition (enumerated)');
    assert(!('assignedVariant' in experiment), 'NO assignedVariant in experiment definition');
    assert(!('currentVariant' in experiment), 'NO currentVariant in experiment definition');
  }

  section('The UNMODIFIED DefaultCompositionService merges AnalyticsPluginConfig into ThemeConfig.resources.settings');
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
    // ThemeConfig.resources.settings. The static Analytics config is
    // deterministically merged.
    const settings = config.resources.settings as Record<string, unknown>;
    const trackingIds = settings['trackingIds'] as string[];
    assert(Array.isArray(trackingIds) && trackingIds.length === 2, 'trackingIds are merged into settings');
    assert(settings['consentBannerStyle'] === 'banner', 'consentBannerStyle is merged into settings');

    const experimentDefinitions = settings['experimentDefinitions'] as Array<Record<string, unknown>>;
    assert(Array.isArray(experimentDefinitions) && experimentDefinitions.length === 1, 'experimentDefinitions are merged into settings');
    assert(experimentDefinitions[0]['id'] === 'exp-hero-headline', 'experiment definition id is preserved');

    const eventSchemas = settings['eventSchemas'] as Array<Record<string, unknown>>;
    assert(Array.isArray(eventSchemas) && eventSchemas.length === 2, 'eventSchemas are merged into settings');
    assert(eventSchemas[0]['name'] === 'page_view', 'page_view event schema is preserved');
    assert(eventSchemas[1]['name'] === 'purchase', 'purchase event schema is preserved');

    // NO LIVE TRACKING STATE leaks into the ThemeConfig.
    assert(!('consentState' in settings), 'NO consentState in ThemeConfig');
    assert(!('consentAccepted' in settings), 'NO consentAccepted in ThemeConfig');
    assert(!('currentVariant' in settings), 'NO currentVariant in ThemeConfig');
    assert(!('assignedVariant' in settings), 'NO assignedVariant in ThemeConfig');
    assert(!('visitorSession' in settings), 'NO visitorSession in ThemeConfig');
    assert(!('sessionId' in settings), 'NO sessionId in ThemeConfig');
    assert(!('revenue' in settings), 'NO revenue in ThemeConfig');
    assert(!('pageViews' in settings), 'NO pageViews in ThemeConfig');
    assert(!('conversions' in settings), 'NO conversions in ThemeConfig');
  }

  section('The experiment definitions in the ThemeConfig carry NO user experiment assignment');
  {
    const readers = createReaders();
    const service = new DefaultCompositionService(
      readers.structureReader,
      readers.presentationReader,
      readers.localizationReader,
      readers.featureReader,
    );

    const config: ThemeConfig = await service.compose({ projectId: 'project-1' });

    const settings = config.resources.settings as Record<string, unknown>;
    const experimentDefinitions = settings['experimentDefinitions'] as Array<Record<string, unknown>>;

    // The Composer and CompositionIdentity remain completely blind to which
    // variant a user sees. The merged experiment definitions carry ONLY the
    // static definition (id, name, variants), NEVER an assignment.
    assert(experimentDefinitions.length === 1, 'one experiment definition is merged');
    assert(!('assignedVariant' in experimentDefinitions[0]), 'NO assignedVariant in merged experiment');
    assert(!('currentVariant' in experimentDefinitions[0]), 'NO currentVariant in merged experiment');
    assert(!('userId' in experimentDefinitions[0]), 'NO userId in merged experiment');
    assert(!('visitorId' in experimentDefinitions[0]), 'NO visitorId in merged experiment');
  }

  section('The Analytics Plugin does NOT bypass the Composer (no ThemeConfig produced by the plugin)');
  {
    // The Analytics Plugin contributes ONLY passive data through
    // FeatureRecord. It NEVER produces a ThemeConfig. The Composer remains the
    // SOLE ORCHESTRATOR. This is proven by the fact that the final ThemeConfig
    // is produced entirely by the UNMODIFIED DefaultCompositionService.
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
