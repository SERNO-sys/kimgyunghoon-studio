/**
 * AWIE V2 - Phase 15.1: Preview System - PreviewMaterializer tests.
 *
 * These tests prove the Preview System is a Dependency Injection (DI) problem,
 * NOT an architecture problem:
 *
 *   1. The PreviewMaterializer takes a Draft and materializes it into a
 *      Preview Dataset (Read Models) via the storage-agnostic
 *      IPreviewDatasetRepository port.
 *   2. The Preview Readers (PreviewStructureReader, PreviewPresentationReader,
 *      PreviewLocalizationReader, PreviewFeatureReader) are ALTERNATE
 *      implementations of the EXISTING Reader contracts.
 *   3. Injecting these Preview Readers into the UNMODIFIED
 *      DefaultCompositionService yields a STANDARD ThemeConfig execution
 *      contract — with NO draft concepts leaking into the Composer.
 *
 * Run with: npx tsx src/cms/core/preview/PreviewMaterializer.test.ts
 */

import { PreviewMaterializer, type Draft } from './PreviewMaterializer';
import {
  PreviewStructureReader,
  PreviewPresentationReader,
  PreviewLocalizationReader,
  PreviewFeatureReader,
} from './PreviewReaders';
import type { IPreviewDatasetRepository, PreviewDataset } from './types';
import { DefaultCompositionService } from '../resolvers/DefaultCompositionService';
import { NotFoundError } from '../resolvers/types';
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
// In-memory IPreviewDatasetRepository (test double)
// ---------------------------------------------------------------------------

/**
 * A minimal in-memory implementation of the storage-agnostic
 * IPreviewDatasetRepository port. This proves the Materializer and the Preview
 * Readers do NOT hardcode storage — they rely on the injected port.
 */
class InMemoryPreviewDatasetRepository implements IPreviewDatasetRepository {
  private readonly store = new Map<string, PreviewDataset>();

  async save(dataset: PreviewDataset): Promise<void> {
    this.store.set(dataset.id, dataset);
  }

  async load(id: string): Promise<PreviewDataset> {
    const dataset = this.store.get(id);
    if (!dataset) {
      throw new NotFoundError(`Preview dataset not found: ${id}`);
    }
    return dataset;
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    structure: {
      pages: [
        { id: 'home', path: '/', sections: ['hero'] },
        { id: 'about', path: '/about', sections: ['text'] },
      ],
      sections: [
        { id: 'hero', type: 'hero', props: { title: 'Draft Hero' } },
        { id: 'text', type: 'text', props: { body: 'Draft body' } },
      ],
      menus: [],
      forms: [],
    },
    presentation: {
      domain: 'example.com',
      favicon: 'favicon.ico',
      logo: 'logo.png',
      assets: [],
      primaryColor: '#123456',
      globalSeo: {
        canonical: 'https://example.com/',
        robots: 'index,follow',
        openGraph: { title: 'Global OG', type: 'website' },
        jsonLd: [{ type: 'Organization', data: { name: 'Org' } }],
      },
    },
    localization: {
      locale: 'ko-KR',
      resolvedRevision: 7,
      title: 'Draft Site',
      tagline: 'Draft tagline',
      description: 'Draft description',
      localSeo: {
        canonical: 'https://example.com/ko-KR/',
        robots: 'noindex',
        openGraph: { title: 'Local OG', locale: 'ko_KR' },
        jsonLd: [{ type: 'WebSite', data: { name: 'Draft Site' } }],
      },
    },
    feature: {
      analytics: { enabled: true },
      seo: { jsonLd: [{ type: 'Product', data: { name: 'Widget' } }] },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  section('PreviewMaterializer materializes a Draft into a Preview Dataset');
  {
    const repository = new InMemoryPreviewDatasetRepository();
    const materializer = new PreviewMaterializer(repository);
    const draft = createDraft();

    const dataset = await materializer.materialize(draft);

    assert(dataset.id === 'draft-1', 'dataset id matches draft id');
    assert(dataset.structure.id === 'draft-1:structure', 'structure record id is namespaced');
    assert(dataset.presentation.id === 'draft-1:presentation', 'presentation record id is namespaced');
    assert(dataset.localization.id === 'draft-1:localization', 'localization record id is namespaced');
    assert(dataset.feature.pluginId === 'draft-1:feature', 'feature record pluginId is namespaced');
    assert(dataset.localization.locale === 'ko-KR', 'locale is extracted');
    assert(dataset.localization.resolvedRevision === 7, 'resolvedRevision is extracted');
    assert(dataset.structure.blueprint !== undefined, 'structure blueprint is carried');
    assert(dataset.presentation.asset !== undefined, 'presentation asset is carried');
    assert(dataset.feature.config !== undefined, 'feature config is carried');

    // The dataset is persisted via the repository port.
    const loaded = await repository.load('draft-1');
    assert(loaded.id === 'draft-1', 'dataset is persisted via the repository port');
  }

  section('Preview Readers are alternate implementations of the EXISTING contracts');
  {
    const repository = new InMemoryPreviewDatasetRepository();
    const materializer = new PreviewMaterializer(repository);
    await materializer.materialize(createDraft());

    const structureReader = new PreviewStructureReader(repository);
    const presentationReader = new PreviewPresentationReader(repository);
    const localizationReader = new PreviewLocalizationReader(repository);
    const featureReader = new PreviewFeatureReader(repository);

    const structure = await structureReader.read('draft-1');
    const presentation = await presentationReader.read('draft-1');
    const localization = await localizationReader.read('draft-1');
    const feature = await featureReader.read('draft-1');

    assert(structure.id === 'draft-1:structure', 'structure reader returns the structure record');
    assert(presentation.id === 'draft-1:presentation', 'presentation reader returns the presentation record');
    assert(localization.id === 'draft-1:localization', 'localization reader returns the localization record');
    assert(feature.pluginId === 'draft-1:feature', 'feature reader returns the feature record');
  }

  section('Preview Readers throw NotFoundError on a missing dataset');
  {
    const repository = new InMemoryPreviewDatasetRepository();
    const structureReader = new PreviewStructureReader(repository);

    let threw = false;
    try {
      await structureReader.read('missing');
    } catch (error) {
      threw = error instanceof NotFoundError;
    }
    assert(threw, 'structure reader throws NotFoundError on missing dataset');
  }

  section('Injecting Preview Readers into the UNMODIFIED DefaultCompositionService yields a standard ThemeConfig');
  {
    const repository = new InMemoryPreviewDatasetRepository();
    const materializer = new PreviewMaterializer(repository);
    await materializer.materialize(createDraft());

    // The DefaultCompositionService is UNMODIFIED. It blindly consumes the
    // injected Preview Readers and produces the exact same ThemeConfig.
    const service = new DefaultCompositionService(
      new PreviewStructureReader(repository),
      new PreviewPresentationReader(repository),
      new PreviewLocalizationReader(repository),
      new PreviewFeatureReader(repository),
    );

    const config: ThemeConfig = await service.compose({ projectId: 'draft-1' });

    // The output is a STANDARD ThemeConfig execution contract.
    assert(config.metadata !== undefined, 'metadata is present');
    assert(config.metadata.title === 'Draft Site', 'title is composed from the draft');
    assert(config.metadata.locale === 'ko-KR', 'locale is composed from the draft');
    assert(config.metadata.domain === 'example.com', 'domain is composed from the draft');
    assert(config.resources !== undefined, 'resources are present');
    assert(config.resources.pages.length === 2, 'pages are composed from the draft');
    assert(config.resources.sections.length === 2, 'sections are composed from the draft');
    assert(config.seo !== undefined, 'seo node is present');
    assert(config.seo?.canonical === 'https://example.com/ko-KR/', 'local canonical wins');
    assert(config.seo?.robots === 'noindex', 'local robots wins');
    assert(config.seo?.openGraph?.title === 'Local OG', 'local OG title wins');
    assert(config.seo?.openGraph?.locale === 'ko_KR', 'local OG locale wins');
    assert(config.seo?.openGraph?.type === 'website', 'global OG type fills the rest');
    assert(config.seo?.jsonLd?.length === 3, 'JSON-LD concatenated Global -> Local -> Plugin');
    assert(config.seo?.jsonLd?.[0]?.type === 'Organization', 'global JSON-LD first');
    assert(config.seo?.jsonLd?.[1]?.type === 'WebSite', 'local JSON-LD second');
    assert(config.seo?.jsonLd?.[2]?.type === 'Product', 'plugin JSON-LD third');
  }

  section('NO draft concepts leak into the Composer');
  {
    const repository = new InMemoryPreviewDatasetRepository();
    const materializer = new PreviewMaterializer(repository);
    await materializer.materialize(createDraft());

    const service = new DefaultCompositionService(
      new PreviewStructureReader(repository),
      new PreviewPresentationReader(repository),
      new PreviewLocalizationReader(repository),
      new PreviewFeatureReader(repository),
    );

    const config = await service.compose({ projectId: 'draft-1' });

    // The ThemeConfig is a pure execution contract. It carries NO draft
    // concepts (no "draft" flag, no draft id, no draft-specific fields).
    const serialized = JSON.stringify(config);
    assert(!serialized.includes('draft-1'), 'no draft id leaks into the ThemeConfig');
    assert(!serialized.includes('"draft"'), 'no draft flag leaks into the ThemeConfig');
    assert(config.metadata.generator === 'awie-cms-composition', 'generator is the standard composition generator');
    assert(config.metadata.generatorVersion === '2.0.0', 'generator version is standard');
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
