/**
 * AWIE V2 - Phase 15.6: CRM & Membership Plugin - Contribution Contract tests.
 *
 * These tests prove the CRM Plugin is a DOMAIN FEATURE, NOT an architectural
 * exception. It contributes through the EXISTING generic FeatureRecord
 * contract and is consumed by the UNMODIFIED DefaultCompositionService.
 *
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008):
 *   1. The CRM Plugin does NOT create new SPIs, new Readers, or new
 *      Composition logic.
 *   2. The CRM Plugin does NOT define new execution contexts and does NOT
 *      bypass the Composer.
 *   3. The UNMODIFIED DefaultCompositionService deterministically merges the
 *      FeatureRecord<CrmPluginConfig> into the final ThemeConfig:
 *        - FeatureRecord.config  -> ThemeConfig.resources.settings
 *        - FeatureRecord.seo.jsonLd -> ThemeConfig.seo.jsonLd
 *          (Organization / ProfilePage schema)
 *
 * CRITICAL CONSTITUTIONAL RULE (LEVEL-A): PRESENTATION VS. IDENTITY
 * (USER-AGNOSTIC COMPOSITION):
 *   "ThemeConfig defines WHAT to show, never TO WHOM, WHEN, FOR HOW MUCH,
 *    or IF POSSIBLE."
 *   - The CRM Plugin contributes ONLY generic UI layout configs
 *     (loginFormVariant, premiumBadgeStyle, memberLayout).
 *   - It MUST NOT contribute user identity, session state, JWTs, user
 *     profiles, permissions, or protected data to the ThemeConfig.
 *   - Personalization and protected content fetching are Application-level
 *     hydration concerns executed via APIs AFTER the UI is rendered.
 *
 * Run with: npx tsx src/cms/plugins/crm/CrmPlugin.test.ts
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
import { CRM_PLUGIN_ID, type CrmPluginConfig } from './types';

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
 * A high-fidelity CrmPluginConfig carrying STATIC UI/presentation
 * configuration. It deliberately contains NO user identity, session state, or
 * protected data.
 */
function createCrmConfig(): CrmPluginConfig {
  return {
    loginFormVariant: 'modal',
    premiumBadgeStyle: 'gold',
    memberLayout: 'sidebar',
  };
}

/**
 * The Organization / ProfilePage JSON-LD structured data payload contributed
 * via FeatureRecord.seo.jsonLd. This is STATIC structured data describing the
 * organization / profile page. It deliberately carries NO user identity,
 * session, or protected data.
 */
function createOrganizationJsonLd(): unknown[] {
  return [
    {
      type: 'Organization',
      data: {
        name: 'Studio Ceramics',
        url: 'https://shop.example.com',
        logo: 'https://cdn.example.com/logo.png',
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          email: 'support@example.com',
        },
      },
    },
    {
      type: 'ProfilePage',
      data: {
        name: 'About the Studio',
        description: 'The story of Studio Ceramics.',
      },
    },
  ];
}

/**
 * Builds the four Readers. The FeatureReader returns a
 * FeatureRecord<CrmPluginConfig> carrying the CRM Plugin's contribution.
 */
function createReaders(): {
  structureReader: IStructureReader;
  presentationReader: IPresentationReader;
  localizationReader: ILocalizationReader;
  featureReader: IFeatureReader<CrmPluginConfig>;
} {
  const structure: StructureRecord = {
    id: 'structure-1',
    blueprint: {
      pages: [{ id: 'home', route: '/', sectionIds: ['membership'] }],
      sections: [{ id: 'membership', type: 'membership', content: { title: 'Members' } }],
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

  // The CRM Plugin contributes through the EXISTING generic FeatureRecord
  // contract. This is a domain feature, NOT an architectural exception.
  const feature: FeatureRecord<CrmPluginConfig> = {
    pluginId: CRM_PLUGIN_ID,
    config: createCrmConfig(),
    seo: {
      jsonLd: createOrganizationJsonLd(),
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
  section('The CRM Plugin contributes through the EXISTING FeatureRecord contract');
  {
    const readers = createReaders();
    const feature = await readers.featureReader.read('project-1');

    // The FeatureRecord is generic over CrmPluginConfig.
    assert(feature.pluginId === CRM_PLUGIN_ID, 'pluginId identifies the CRM Plugin');
    assert(feature.config.loginFormVariant === 'modal', 'loginFormVariant is carried in config');
    assert(feature.config.premiumBadgeStyle === 'gold', 'premiumBadgeStyle is carried in config');
    assert(feature.config.memberLayout === 'sidebar', 'memberLayout is carried in config');

    // NO IDENTITY / SESSION / PROTECTED DATA: the config carries only static
    // UI/presentation values.
    const configKeys = Object.keys(feature.config);
    assert(!configKeys.includes('userProfile'), 'NO userProfile in config');
    assert(!configKeys.includes('userEmail'), 'NO userEmail in config');
    assert(!configKeys.includes('userName'), 'NO userName in config');
    assert(!configKeys.includes('sessionToken'), 'NO sessionToken in config');
    assert(!configKeys.includes('sessionId'), 'NO sessionId in config');
    assert(!configKeys.includes('jwt'), 'NO jwt in config');
    assert(!configKeys.includes('protectedContent'), 'NO protectedContent in config');
    assert(!configKeys.includes('permissions'), 'NO permissions in config');

    const firstNode = feature.seo?.jsonLd?.[0] as Record<string, unknown> | undefined;
    assert(firstNode?.['type'] === 'Organization', 'Organization JSON-LD is contributed');
  }

  section('The UNMODIFIED DefaultCompositionService merges CrmPluginConfig into ThemeConfig.resources.settings');
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
    // ThemeConfig.resources.settings. The static CRM config is
    // deterministically merged.
    const settings = config.resources.settings as Record<string, unknown>;
    assert(settings['loginFormVariant'] === 'modal', 'loginFormVariant is merged into settings');
    assert(settings['premiumBadgeStyle'] === 'gold', 'premiumBadgeStyle is merged into settings');
    assert(settings['memberLayout'] === 'sidebar', 'memberLayout is merged into settings');

    // NO IDENTITY / SESSION / PROTECTED DATA leaks into the ThemeConfig.
    assert(!('userProfile' in settings), 'NO userProfile in ThemeConfig');
    assert(!('userEmail' in settings), 'NO userEmail in ThemeConfig');
    assert(!('userName' in settings), 'NO userName in ThemeConfig');
    assert(!('sessionToken' in settings), 'NO sessionToken in ThemeConfig');
    assert(!('sessionId' in settings), 'NO sessionId in ThemeConfig');
    assert(!('jwt' in settings), 'NO jwt in ThemeConfig');
    assert(!('protectedContent' in settings), 'NO protectedContent in ThemeConfig');
    assert(!('permissions' in settings), 'NO permissions in ThemeConfig');
  }

  section('The UNMODIFIED DefaultCompositionService merges Organization/ProfilePage JSON-LD into ThemeConfig.seo.jsonLd');
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
    // ThemeConfig.seo.jsonLd. The Organization and ProfilePage structured data
    // are deterministically merged.
    assert(config.seo?.jsonLd?.length === 2, 'Organization + ProfilePage JSON-LD are merged into seo.jsonLd');
    assert(config.seo?.jsonLd?.[0]?.type === 'Organization', 'JSON-LD[0] type is Organization');
    assert(config.seo?.jsonLd?.[1]?.type === 'ProfilePage', 'JSON-LD[1] type is ProfilePage');

    const orgData = config.seo?.jsonLd?.[0]?.data as Record<string, unknown>;
    assert(orgData['name'] === 'Studio Ceramics', 'Organization name is preserved');
    assert(orgData['url'] === 'https://shop.example.com', 'Organization url is preserved');

    const profileData = config.seo?.jsonLd?.[1]?.data as Record<string, unknown>;
    assert(profileData['name'] === 'About the Studio', 'ProfilePage name is preserved');

    // The static JSON-LD carries NO user identity, session, or protected data.
    assert(!('userProfile' in orgData), 'NO userProfile in Organization JSON-LD');
    assert(!('sessionToken' in orgData), 'NO sessionToken in Organization JSON-LD');
    assert(!('protectedContent' in orgData), 'NO protectedContent in Organization JSON-LD');
  }

  section('The CRM Plugin does NOT bypass the Composer (no ThemeConfig produced by the plugin)');
  {
    // The CRM Plugin contributes ONLY passive data through FeatureRecord. It
    // NEVER produces a ThemeConfig. The Composer remains the SOLE
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
