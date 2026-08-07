/**
 * AWIE V2 - Phase 15.4: Reservation Plugin - Contribution Contract tests.
 *
 * These tests prove the Reservation Plugin is a DOMAIN FEATURE, NOT an
 * architectural exception. It contributes through the EXISTING generic
 * FeatureRecord contract and is consumed by the UNMODIFIED
 * DefaultCompositionService.
 *
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008):
 *   1. The Reservation Plugin does NOT create new SPIs, new Readers, or new
 *      Composition logic.
 *   2. The Reservation Plugin does NOT define new execution contexts and does
 *      NOT bypass the Composer.
 *   3. The UNMODIFIED DefaultCompositionService deterministically merges the
 *      FeatureRecord<ReservationPluginConfig> into the final ThemeConfig:
 *        - FeatureRecord.config  -> ThemeConfig.resources.settings
 *        - FeatureRecord.seo.jsonLd -> ThemeConfig.seo.jsonLd (Event schema)
 *
 * CRITICAL CONSTITUTIONAL RULE: STRICT SEPARATION OF PRESENTATION AND
 * TRANSACTION (NO LIVE STATE IN THEME-CONFIG):
 *   - The Reservation Plugin contributes ONLY static UI/policy configuration
 *     (bookingWindowDays, maxPartySize, operatingHours).
 *   - It MUST NOT contribute live business state (remainingSlots,
 *     availableTime, paymentStatus) to the ThemeConfig.
 *   - Execution (availability checks, booking) happens via Application APIs
 *     AFTER rendering.
 *
 * Run with: npx tsx src/cms/plugins/reservation/ReservationPlugin.test.ts
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
import { RESERVATION_PLUGIN_ID, type ReservationPluginConfig } from './types';

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
 * A high-fidelity ReservationPluginConfig carrying STATIC UI/policy
 * configuration. It deliberately contains NO live business state.
 */
function createReservationConfig(): ReservationPluginConfig {
  return {
    bookingWindowDays: 30,
    maxPartySize: 8,
    operatingHours: [
      { day: 'monday', open: '09:00', close: '18:00' },
      { day: 'tuesday', open: '09:00', close: '18:00' },
      { day: 'saturday', open: '10:00', close: '20:00' },
    ],
  };
}

/**
 * The Event JSON-LD structured data payload contributed via
 * FeatureRecord.seo.jsonLd. This is STATIC structured data describing the
 * reservation event. It carries NO live availability state.
 */
function createEventJsonLd(): unknown[] {
  return [
    {
      type: 'Event',
      data: {
        name: 'Chef\'s Table Tasting',
        startDate: '2026-09-01T19:00:00+09:00',
        endDate: '2026-09-01T22:00:00+09:00',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: 'The Studio Restaurant',
          address: { '@type': 'PostalAddress', addressLocality: 'Seoul' },
        },
        offers: {
          '@type': 'Offer',
          price: '120000',
          priceCurrency: 'KRW',
          availability: 'https://schema.org/InStock',
        },
      },
    },
  ];
}

/**
 * Builds the four Readers. The FeatureReader returns a
 * FeatureRecord<ReservationPluginConfig> carrying the Reservation Plugin's
 * contribution.
 */
function createReaders(): {
  structureReader: IStructureReader;
  presentationReader: IPresentationReader;
  localizationReader: ILocalizationReader;
  featureReader: IFeatureReader<ReservationPluginConfig>;
} {
  const structure: StructureRecord = {
    id: 'structure-1',
    blueprint: {
      pages: [{ id: 'home', route: '/', sectionIds: ['reservation'] }],
      sections: [{ id: 'reservation', type: 'reservation', content: { title: 'Reserve a Table' } }],
      menus: [],
      forms: [],
    },
  };

  const presentation: PresentationRecord = {
    id: 'presentation-1',
    asset: {
      domain: 'restaurant.example.com',
      favicon: 'favicon.ico',
      logo: 'logo.png',
      assets: [],
      primaryColor: '#2e1a1a',
    },
  };

  const localization: LocalizationRecord = {
    id: 'localization-1',
    locale: 'ko-KR',
    resolvedRevision: 3,
    content: {
      title: 'The Studio Restaurant',
      tagline: 'Reserve your table',
      description: 'A fine dining experience',
    },
  };

  // The Reservation Plugin contributes through the EXISTING generic
  // FeatureRecord contract. This is a domain feature, NOT an architectural
  // exception.
  const feature: FeatureRecord<ReservationPluginConfig> = {
    pluginId: RESERVATION_PLUGIN_ID,
    config: createReservationConfig(),
    seo: {
      jsonLd: createEventJsonLd(),
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
  section('The Reservation Plugin contributes through the EXISTING FeatureRecord contract');
  {
    const readers = createReaders();
    const feature = await readers.featureReader.read('project-1');

    // The FeatureRecord is generic over ReservationPluginConfig.
    assert(feature.pluginId === RESERVATION_PLUGIN_ID, 'pluginId identifies the Reservation Plugin');
    assert(feature.config.bookingWindowDays === 30, 'bookingWindowDays is carried in config');
    assert(feature.config.maxPartySize === 8, 'maxPartySize is carried in config');
    assert(feature.config.operatingHours.length === 3, 'operatingHours are carried in config');
    assert(
      feature.config.operatingHours[0].day === 'monday' &&
        feature.config.operatingHours[0].open === '09:00',
      'operatingHours carry day/open/close entries',
    );

    // NO LIVE STATE: the config carries only static UI/policy values.
    const configKeys = Object.keys(feature.config);
    assert(!configKeys.includes('remainingSlots'), 'NO remainingSlots live state in config');
    assert(!configKeys.includes('availableTime'), 'NO availableTime live state in config');
    assert(!configKeys.includes('paymentStatus'), 'NO paymentStatus live state in config');

    const firstNode = feature.seo?.jsonLd?.[0] as Record<string, unknown> | undefined;
    assert(firstNode?.['type'] === 'Event', 'Event JSON-LD is contributed');
  }

  section('The UNMODIFIED DefaultCompositionService merges ReservationPluginConfig into ThemeConfig.resources.settings');
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
    // ThemeConfig.resources.settings. The static reservation policy is
    // deterministically merged.
    const settings = config.resources.settings as Record<string, unknown>;
    assert(settings['bookingWindowDays'] === 30, 'bookingWindowDays is merged into settings');
    assert(settings['maxPartySize'] === 8, 'maxPartySize is merged into settings');
    assert(
      Array.isArray(settings['operatingHours']) &&
        (settings['operatingHours'] as unknown[]).length === 3,
      'operatingHours are merged into settings',
    );

    // NO LIVE STATE leaks into the ThemeConfig.
    assert(!('remainingSlots' in settings), 'NO remainingSlots live state in ThemeConfig');
    assert(!('availableTime' in settings), 'NO availableTime live state in ThemeConfig');
    assert(!('paymentStatus' in settings), 'NO paymentStatus live state in ThemeConfig');
  }

  section('The UNMODIFIED DefaultCompositionService merges Event JSON-LD into ThemeConfig.seo.jsonLd');
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
    // ThemeConfig.seo.jsonLd. The Event structured data is deterministically
    // merged.
    assert(config.seo?.jsonLd?.length === 1, 'Event JSON-LD is merged into seo.jsonLd');
    assert(config.seo?.jsonLd?.[0]?.type === 'Event', 'JSON-LD type is Event');
    const data = config.seo?.jsonLd?.[0]?.data as Record<string, unknown>;
    assert(data['name'] === 'Chef\'s Table Tasting', 'Event name is preserved');
    assert(data['eventStatus'] === 'https://schema.org/EventScheduled', 'Event status is preserved');
    assert(data['eventAttendanceMode'] === 'https://schema.org/OfflineEventAttendanceMode', 'Event attendance mode is preserved');
  }

  section('The Reservation Plugin does NOT bypass the Composer (no ThemeConfig produced by the plugin)');
  {
    // The Reservation Plugin contributes ONLY passive data through
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
    assert(config.metadata.title === 'The Studio Restaurant', 'title is composed from localization');
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
