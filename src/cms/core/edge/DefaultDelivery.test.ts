/**
 * AWIE V2 - Phase 15.2: Edge Delivery - DefaultDelivery tests.
 *
 * These tests prove the two Level-A constitutional rules:
 *
 *   1. Serialization is a Policy, NOT a Transport. The DefaultEdgeDeliveryAdapter
 *      NEVER serializes. It consumes ONLY a DeliveryArtifact + CompositionIdentity.
 *
 *   2. Transport Independence. The DefaultEdgeDeliveryAdapter works seamlessly
 *      with BOTH the JsonDeliverySerializer AND a dummy MessagePackSerializer.
 *      It generates valid ETags and responses regardless of the serializer used.
 *
 * Run with: npx tsx src/cms/core/edge/DefaultDelivery.test.ts
 */

import { JsonDeliverySerializer, DefaultEdgeDeliveryAdapter } from './DefaultDelivery';
import type {
  DeliveryArtifact,
  IDeliverySerializer,
  IEdgeDeliveryAdapter,
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
// Dummy MessagePackSerializer (ALTERNATE IDeliverySerializer implementation)
// ---------------------------------------------------------------------------

/**
 * A dummy MessagePack-style serializer. It is a valid IDeliverySerializer
 * implementation that produces a BINARY payload (Uint8Array) with a different
 * content type. This proves the Edge Adapter is completely blind to the
 * encoding format.
 */
class DummyMessagePackSerializer implements IDeliverySerializer {
  async serialize(config: ThemeConfig): Promise<DeliveryArtifact> {
    // A trivial binary encoding: JSON bytes prefixed with a magic marker.
    const json = JSON.stringify(config);
    const bytes = new TextEncoder().encode(json);
    const payload = new Uint8Array(bytes.length + 1);
    payload[0] = 0xc1; // MessagePack-style magic marker.
    payload.set(bytes, 1);
    return {
      payload,
      contentType: 'application/msgpack',
      byteLength: payload.byteLength,
    };
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createThemeConfig(): ThemeConfig {
  return {
    metadata: {
      title: 'Edge Site',
      locale: 'ko-KR',
      domain: 'example.com',
      createdAt: '2026-08-07T00:00:00.000Z',
      updatedAt: '2026-08-07T00:00:00.000Z',
      generator: 'awie-cms-composition',
      generatorVersion: '2.0.0',
    },
    resources: {
      pages: [{ id: 'home', route: '/', title: 'Home', sectionIds: ['hero'] }],
      sections: [{ id: 'hero', type: 'hero', content: { title: 'Hello' } }],
      assets: [],
      settings: {},
      menus: [],
      forms: [],
    },
    seo: {
      canonical: 'https://example.com/',
      robots: 'index,follow',
    },
    policies: {},
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  section('JsonDeliverySerializer produces a JSON DeliveryArtifact');
  {
    const serializer = new JsonDeliverySerializer();
    const artifact = await serializer.serialize(createThemeConfig());

    assert(artifact.contentType === 'application/json', 'content type is application/json');
    assert(typeof artifact.payload === 'string', 'payload is a string');
    assert(artifact.byteLength > 0, 'byte length is positive');
    assert(artifact.byteLength === Buffer.byteLength(artifact.payload as string, 'utf8'), 'byte length matches payload');
  }

  section('DummyMessagePackSerializer produces a BINARY DeliveryArtifact');
  {
    const serializer = new DummyMessagePackSerializer();
    const artifact = await serializer.serialize(createThemeConfig());

    assert(artifact.contentType === 'application/msgpack', 'content type is application/msgpack');
    assert(artifact.payload instanceof Uint8Array, 'payload is a Uint8Array (binary)');
    assert(artifact.byteLength === (artifact.payload as Uint8Array).byteLength, 'byte length matches binary payload');
  }

  section('DefaultEdgeDeliveryAdapter works with the JSON serializer (Transport Independence)');
  {
    const serializer = new JsonDeliverySerializer();
    const adapter: IEdgeDeliveryAdapter = new DefaultEdgeDeliveryAdapter();

    const artifact = await serializer.serialize(createThemeConfig());
    const response = await adapter.deliver('project:ko-KR:rev7', artifact);

    assert(response.payload === artifact.payload, 'payload is passed through unchanged');
    assert(response.contentType === 'application/json', 'content type is passed through');
    assert(response.byteLength === artifact.byteLength, 'byte length is passed through');
    assert(response.etag.startsWith('"') && response.etag.endsWith('"'), 'etag is a quoted strong etag');
    assert(response.etag.length === 10, 'etag is 8 hex chars + quotes');
    assert(response.cacheControl.includes('public'), 'cache-control is public');
    assert(response.cacheControl.includes('immutable'), 'cache-control is immutable');
  }

  section('DefaultEdgeDeliveryAdapter works with the MessagePack serializer (Transport Independence)');
  {
    const serializer = new DummyMessagePackSerializer();
    const adapter: IEdgeDeliveryAdapter = new DefaultEdgeDeliveryAdapter();

    const artifact = await serializer.serialize(createThemeConfig());
    const response = await adapter.deliver('project:ko-KR:rev7', artifact);

    assert(response.payload === artifact.payload, 'binary payload is passed through unchanged');
    assert(response.contentType === 'application/msgpack', 'content type is passed through');
    assert(response.byteLength === artifact.byteLength, 'byte length is passed through');
    assert(response.etag.startsWith('"') && response.etag.endsWith('"'), 'etag is a quoted strong etag');
    assert(response.etag.length === 10, 'etag is 8 hex chars + quotes');
    assert(response.cacheControl.includes('public'), 'cache-control is public');
    assert(response.cacheControl.includes('immutable'), 'cache-control is immutable');
  }

  section('ETag is deterministic and identity-scoped');
  {
    const adapter = new DefaultEdgeDeliveryAdapter();
    const serializer = new JsonDeliverySerializer();
    const artifact = await serializer.serialize(createThemeConfig());

    const r1 = await adapter.deliver('project:ko-KR:rev7', artifact);
    const r2 = await adapter.deliver('project:ko-KR:rev7', artifact);
    const r3 = await adapter.deliver('project:en-US:rev7', artifact);

    assert(r1.etag === r2.etag, 'same identity + artifact yields the same etag');
    assert(r1.etag !== r3.etag, 'different identity yields a different etag');
  }

  section('The Edge Adapter NEVER serializes (no JSON.stringify in the adapter)');
  {
    // The adapter's source must not contain JSON.stringify. This is a static
    // proof that serialization is decoupled from transport.
    const adapterSource = DefaultEdgeDeliveryAdapter.toString();
    assert(!adapterSource.includes('JSON.stringify'), 'adapter does not call JSON.stringify');
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
