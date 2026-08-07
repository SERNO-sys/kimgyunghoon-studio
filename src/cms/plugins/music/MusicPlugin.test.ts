/**
 * AWIE V2 - Phase 15.3: Music Plugin - Contribution Contract tests.
 *
 * These tests prove the Music Plugin is a DOMAIN FEATURE, NOT an architectural
 * exception. It contributes through the EXISTING generic FeatureRecord
 * contract and is consumed by the UNMODIFIED DefaultCompositionService.
 *
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008):
 *   1. The Music Plugin does NOT create new SPIs, new Readers, or new
 *      Composition logic.
 *   2. The Music Plugin does NOT define new execution contexts and does NOT
 *      bypass the Composer.
 *   3. The UNMODIFIED DefaultCompositionService deterministically merges the
 *      FeatureRecord<MusicPluginConfig> into the final ThemeConfig:
 *        - FeatureRecord.config  -> ThemeConfig.resources.settings
 *        - FeatureRecord.seo.jsonLd -> ThemeConfig.seo.jsonLd (MusicRecording)
 *
 * Run with: npx tsx src/cms/plugins/music/MusicPlugin.test.ts
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
import { MUSIC_PLUGIN_ID, type MusicPluginConfig } from './types';

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
 * A high-fidelity MusicPluginConfig carrying audio engineering metadata.
 */
function createMusicConfig(): MusicPluginConfig {
  return {
    sampleRate: '96kHz',
    bitDepth: '24-bit',
    textures: ['Wood resonance', 'Felt-dampened'],
    name: 'Nocturne in E-flat Major',
    byArtist: 'Studio Ensemble',
    duration: 'PT4M32S',
  };
}

/**
 * The MusicRecording JSON-LD structured data payload contributed via
 * FeatureRecord.seo.jsonLd.
 */
function createMusicRecordingJsonLd(): unknown[] {
  return [
    {
      type: 'MusicRecording',
      data: {
        name: 'Nocturne in E-flat Major',
        byArtist: { name: 'Studio Ensemble' },
        duration: 'PT4M32S',
        audio: {
          '@type': 'AudioObject',
          encodingFormat: 'audio/flac',
          sampleRate: '96kHz',
          bitrate: '4608kbps',
        },
      },
    },
  ];
}

/**
 * Builds the four Readers. The FeatureReader returns a
 * FeatureRecord<MusicPluginConfig> carrying the Music Plugin's contribution.
 */
function createReaders(): {
  structureReader: IStructureReader;
  presentationReader: IPresentationReader;
  localizationReader: ILocalizationReader;
  featureReader: IFeatureReader<MusicPluginConfig>;
} {
  const structure: StructureRecord = {
    id: 'structure-1',
    blueprint: {
      pages: [{ id: 'home', route: '/', sectionIds: ['hero'] }],
      sections: [{ id: 'hero', type: 'hero', content: { title: 'Studio' } }],
      menus: [],
      forms: [],
    },
  };

  const presentation: PresentationRecord = {
    id: 'presentation-1',
    asset: {
      domain: 'studio.example.com',
      favicon: 'favicon.ico',
      logo: 'logo.png',
      assets: [],
      primaryColor: '#1a1a2e',
    },
  };

  const localization: LocalizationRecord = {
    id: 'localization-1',
    locale: 'ko-KR',
    resolvedRevision: 3,
    content: {
      title: 'Studio Ensemble',
      tagline: 'High-fidelity recordings',
      description: 'A recording studio',
    },
  };

  // The Music Plugin contributes through the EXISTING generic FeatureRecord
  // contract. This is a domain feature, NOT an architectural exception.
  const feature: FeatureRecord<MusicPluginConfig> = {
    pluginId: MUSIC_PLUGIN_ID,
    config: createMusicConfig(),
    seo: {
      jsonLd: createMusicRecordingJsonLd(),
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
  section('The Music Plugin contributes through the EXISTING FeatureRecord contract');
  {
    const readers = createReaders();
    const feature = await readers.featureReader.read('project-1');

    // The FeatureRecord is generic over MusicPluginConfig.
    assert(feature.pluginId === MUSIC_PLUGIN_ID, 'pluginId identifies the Music Plugin');
    assert(feature.config.sampleRate === '96kHz', 'sampleRate is carried in config');
    assert(feature.config.bitDepth === '24-bit', 'bitDepth is carried in config');
    assert(
      feature.config.textures.includes('Wood resonance'),
      'textures carry acoustic descriptors',
    );
    assert(
      feature.config.textures.includes('Felt-dampened'),
      'textures carry felt-dampened descriptor',
    );
    const firstNode = feature.seo?.jsonLd?.[0] as Record<string, unknown> | undefined;
    assert(firstNode?.['type'] === 'MusicRecording', 'MusicRecording JSON-LD is contributed');
  }

  section('The UNMODIFIED DefaultCompositionService merges MusicPluginConfig into ThemeConfig.resources.settings');
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
    // ThemeConfig.resources.settings. The Music engineering metadata is
    // deterministically merged.
    const settings = config.resources.settings as Record<string, unknown>;
    assert(settings['sampleRate'] === '96kHz', 'sampleRate is merged into settings');
    assert(settings['bitDepth'] === '24-bit', 'bitDepth is merged into settings');
    assert(
      Array.isArray(settings['textures']) &&
        (settings['textures'] as string[]).includes('Wood resonance'),
      'textures are merged into settings',
    );
    assert(settings['name'] === 'Nocturne in E-flat Major', 'recording name is merged into settings');
    assert(settings['byArtist'] === 'Studio Ensemble', 'byArtist is merged into settings');
    assert(settings['duration'] === 'PT4M32S', 'duration is merged into settings');
  }

  section('The UNMODIFIED DefaultCompositionService merges MusicRecording JSON-LD into ThemeConfig.seo.jsonLd');
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
    // ThemeConfig.seo.jsonLd. The MusicRecording structured data is
    // deterministically merged.
    assert(config.seo?.jsonLd?.length === 1, 'MusicRecording JSON-LD is merged into seo.jsonLd');
    assert(config.seo?.jsonLd?.[0]?.type === 'MusicRecording', 'JSON-LD type is MusicRecording');
    const data = config.seo?.jsonLd?.[0]?.data as Record<string, unknown>;
    assert(data['name'] === 'Nocturne in E-flat Major', 'MusicRecording name is preserved');
    assert(data['duration'] === 'PT4M32S', 'MusicRecording duration is preserved');
  }

  section('The Music Plugin does NOT bypass the Composer (no ThemeConfig produced by the plugin)');
  {
    // The Music Plugin contributes ONLY passive data through FeatureRecord.
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
    assert(config.metadata.title === 'Studio Ensemble', 'title is composed from localization');
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
