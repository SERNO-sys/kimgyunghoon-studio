/**
 * AWIE V2 - Phase 11: Runtime Services Test.
 *
 * This test proves the Runtime Services Foundation is complete and correct:
 *
 *   1. ASSET RESOLVER
 *      Resolves asset ids to usable URLs deterministically.
 *
 *   2. LOCALIZATION
 *      Translates keys with parameter interpolation deterministically.
 *
 *   3. CACHE
 *      Stores, retrieves, expires, and clears values.
 *
 *   4. MEDIA PIPELINE
 *      Transforms media assets deterministically.
 *
 *   5. SEO
 *      Derives SEO metadata from the ThemeConfig (the SSOT).
 *
 *   6. ACCESSIBILITY
 *      Derives accessibility attributes for semantic components.
 *
 *   7. ANALYTICS HOOKS
 *      Emits analytics events.
 *
 *   8. RUNTIME PERFORMANCE
 *      Measures execution timing.
 *
 *   9. SECURITY SERVICES
 *      Sanitizes HTML, builds CSP, validates URLs.
 *
 *   10. SERVICE REGISTRY
 *      Registers, resolves, and freezes runtime services.
 *
 * STRICT CONSTRAINT: This test MUST NOT contain any business logic. It is
 * pure infrastructure verification.
 */

import {
  BaseService,
  CancelledError,
  CircuitOpenError,
  createChildTraceContext,
  createExecutionContext,
  createTraceContext,
  DeadlineExceededError,
  DefaultAccessibility,
  DefaultAnalytics,
  DefaultAssetResolver,
  DefaultCache,
  DefaultCancellationToken,
  DefaultCircuitBreaker,
  DefaultDeadline,
  DefaultDiagnosticsPipeline,
  DefaultFeatureFlagService,
  DefaultLocalization,
  DefaultMediaPipeline,
  DefaultMetricsCollector,
  DefaultMetricsSinkRegistry,
  DefaultMigrationPipeline,
  DefaultMigrationRuleRegistry,
  DefaultNormalizer,
  DefaultPerformance,
  DefaultRetryPolicy,
  DefaultRuntimeEventBus,
  DefaultRuntimeServiceRegistry,
  DefaultSecurity,
  DefaultSeo,
  DefaultSinkRegistry,
  MigrationChainGapError,
  ResilientExternalClient,
  RetriesExhaustedError,
  RuntimeServiceRegistryFrozenError,
  SemanticVersionPolicy,
  StdoutMetricsSink,
  StdoutSink,
} from '../src/lib/runtime-services';



import type { ExternalClient, RuntimeEvent } from '../src/lib/runtime-services';
import type { ThemeConfig } from '../src/lib/theme-config/v2';





// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const config: ThemeConfig = {
  metadata: {
    title: 'Acme Studio',
    tagline: 'We build things',
    description: 'A design studio.',
    locale: 'en',
    domain: 'https://acme.example.com',
    logo: 'logo',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    generator: 'awie-engine',
    generatorVersion: '1.0.0',
  },
  intent: 'brand_experience',
  resources: {
    pages: [
      {
        id: 'home',
        route: '/',
        title: 'Home',
        description: 'Welcome to Acme Studio.',
        sectionIds: ['hero'],
        isHome: true,
      },
      {
        id: 'about',
        route: '/about',
        title: 'About Us',
        description: 'Learn about Acme Studio.',
        sectionIds: ['text'],
      },
    ],
    sections: [
      {
        id: 'hero',
        type: 'hero',
        content: { heading: 'Welcome' },
      },
      {
        id: 'text',
        type: 'text',
        content: { body: 'About text' },
      },
    ],
    assets: [
      {
        id: 'logo',
        url: 'https://cdn.example.com/logo.png',
        mimeType: 'image/png',
        width: 200,
        height: 200,
        alt: 'Acme Studio logo',
      },
      {
        id: 'hero-bg',
        url: 'https://cdn.example.com/hero.jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        alt: 'Hero background',
      },
    ],
    settings: {},
    menus: [],
    forms: [],
  },
  policies: {},
};

// ---------------------------------------------------------------------------
// 1. Asset Resolver
// ---------------------------------------------------------------------------

section('1. Asset Resolver');

const assetResolver = new DefaultAssetResolver(config.resources.assets);

const logo = assetResolver.resolve('logo');
assert(logo !== undefined, 'resolves the "logo" asset');
assert(logo?.url === 'https://cdn.example.com/logo.png', 'resolves the logo URL');
assert(logo?.mimeType === 'image/png', 'resolves the logo MIME type');
assert(logo?.alt === 'Acme Studio logo', 'resolves the logo alt text');

const heroBg = assetResolver.resolve('hero-bg');
assert(heroBg?.width === 1920, 'resolves the hero background width');

const unknown = assetResolver.resolve('missing');
assert(unknown === undefined, 'returns undefined for an unknown asset');

// Determinism: same id -> same URL.
assert(
  assetResolver.resolve('logo')?.url === assetResolver.resolve('logo')?.url,
  'is deterministic (same id -> same URL)',
);

// ---------------------------------------------------------------------------
// 2. Localization
// ---------------------------------------------------------------------------

section('2. Localization');

const localization = new DefaultLocalization('en', {
  greeting: 'Hello, {name}!',
  welcome: 'Welcome to our site',
  cta: 'Get started',
});

assert(localization.getLocale() === 'en', 'returns the active locale');
assert(
  localization.translate('welcome') === 'Welcome to our site',
  'translates a simple key',
);
assert(
  localization.translate('greeting', { name: 'World' }) === 'Hello, World!',
  'interpolates parameters',
);
assert(
  localization.translate('missing') === 'missing',
  'returns the key itself when not found',
);
assert(localization.has('cta'), 'has() returns true for an existing key');
assert(!localization.has('missing'), 'has() returns false for a missing key');

// ---------------------------------------------------------------------------
// 3. Cache
// ---------------------------------------------------------------------------

section('3. Cache');

const cache = new DefaultCache();

cache.set<{ data: number }>('key', { data: 42 });
assert(cache.get<{ data: number }>('key')?.data === 42, 'stores and retrieves a value');

assert(cache.has('key'), 'has() returns true for a stored key');

cache.set('ttl', 'value', 50);
assert(cache.get('ttl') === 'value', 'stores a value with a TTL');

cache.delete('key');
assert(cache.get('key') === undefined, 'deletes a value');

cache.set('expired', 'x', -1);
assert(cache.get('expired') === undefined, 'treats expired entries as absent');

cache.set('a', 1);
cache.set('b', 2);
cache.clear();
assert(cache.get('a') === undefined && cache.get('b') === undefined, 'clears all values');

// ---------------------------------------------------------------------------
// 4. Media Pipeline
// ---------------------------------------------------------------------------

section('4. Media Pipeline');

const mediaPipeline = new DefaultMediaPipeline();

const transformed = mediaPipeline.transform({
  source: 'https://cdn.example.com/hero.jpg',
  width: 800,
  format: 'webp',
  quality: 80,
});
assert(
  transformed.url === 'https://cdn.example.com/hero.jpg?w=800&fm=webp&q=80',
  'transforms a media asset with width, format, and quality',
);
assert(transformed.width === 800, 'returns the transformed width');
assert(transformed.format === 'webp', 'returns the transformed format');

const noParams = mediaPipeline.transform({ source: 'https://cdn.example.com/a.png' });
assert(
  noParams.url === 'https://cdn.example.com/a.png',
  'returns the source URL unchanged when no params are given',
);

// Determinism: same request -> same URL.
assert(
  mediaPipeline.transform({ source: 'x', width: 100 }).url ===
    mediaPipeline.transform({ source: 'x', width: 100 }).url,
  'is deterministic (same request -> same URL)',
);

// ---------------------------------------------------------------------------
// 5. SEO
// ---------------------------------------------------------------------------

section('5. SEO');

const seo = new DefaultSeo();

const homeSeo = seo.build(config, 'home');
assert(homeSeo.title === 'Home', 'uses the page title');
assert(homeSeo.description === 'Welcome to Acme Studio.', 'uses the page description');
assert(
  homeSeo.canonical === 'https://acme.example.com/',
  'builds the canonical URL from domain + route',
);
assert(homeSeo.ogTitle === 'Home', 'builds the Open Graph title');
assert(homeSeo.ogImage === 'https://cdn.example.com/logo.png', 'resolves the OG image');
assert(homeSeo.robots === 'index,follow', 'defaults the robots directive');

const aboutSeo = seo.build(config, 'about');
assert(
  aboutSeo.canonical === 'https://acme.example.com/about',
  'builds the canonical URL for the about page',
);

const overrideSeo = seo.build(config, 'home', {
  canonical: 'https://custom.example.com/',
  robots: 'noindex',
});
assert(overrideSeo.canonical === 'https://custom.example.com/', 'honors the canonical override');
assert(overrideSeo.robots === 'noindex', 'honors the robots override');

// Determinism: same config + page -> same metadata.
assert(
  seo.build(config, 'home').title === seo.build(config, 'home').title,
  'is deterministic (same config + page -> same metadata)',
);

// ---------------------------------------------------------------------------
// 6. Accessibility
// ---------------------------------------------------------------------------

section('6. Accessibility');

const accessibility = new DefaultAccessibility();

const heroAttrs = accessibility.attributes('hero', 'Main hero section');
assert(heroAttrs.role === 'banner', 'maps hero to the banner role');
assert(heroAttrs['aria-label'] === 'Main hero section', 'sets the aria-label');

const footerAttrs = accessibility.attributes('footer');
assert(footerAttrs.role === 'contentinfo', 'maps footer to the contentinfo role');

const unknownAttrs = accessibility.attributes('unknown');
assert(unknownAttrs.role === undefined, 'returns no role for an unknown component');

// Determinism: same component -> same attributes.
assert(
  accessibility.attributes('hero').role === accessibility.attributes('hero').role,
  'is deterministic (same component -> same attributes)',
);

// ---------------------------------------------------------------------------
// 7. Analytics Hooks
// ---------------------------------------------------------------------------

section('7. Analytics Hooks');

const analytics = new DefaultAnalytics();

analytics.track({
  name: 'page_view',
  properties: { path: '/' },
  timestamp: '2026-01-01T00:00:00.000Z',
});
analytics.track({
  name: 'cta_click',
  timestamp: '2026-01-01T00:00:01.000Z',
});

const events = analytics.getEvents();
assert(events.length === 2, 'collects emitted events');
assert(events[0].name === 'page_view', 'records the first event name');
assert(events[1].name === 'cta_click', 'records the second event name');

// ---------------------------------------------------------------------------
// 8. Runtime Performance
// ---------------------------------------------------------------------------

section('8. Runtime Performance');

const performance = new DefaultPerformance();

const stop = performance.start('render');
const measurement = stop();
assert(measurement.name === 'render', 'records the measurement name');
assert(measurement.durationMs >= 0, 'records a non-negative duration');
assert(measurement.startedAt.length > 0, 'records a start timestamp');

const measurements = performance.getMeasurements();
assert(measurements.length === 1, 'collects the measurement');

// ---------------------------------------------------------------------------
// 9. Security Services
// ---------------------------------------------------------------------------

section('9. Security Services');

const security = new DefaultSecurity();

const sanitized = security.sanitizeHtml(
  '<p>Hello</p><script>alert("xss")</script><img src="javascript:alert(1)" onerror="x()">',
);
assert(!sanitized.includes('<script'), 'removes script tags');
assert(!sanitized.includes('onerror'), 'removes event handler attributes');
assert(!sanitized.includes('javascript:'), 'removes javascript: URLs');
assert(sanitized.includes('<p>Hello</p>'), 'preserves safe HTML');

const csp = security.buildCsp({
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'https:'],
});
assert(
  csp.includes("default-src 'self'"),
  'builds the default-src directive',
);
assert(
  csp.includes("script-src 'self' 'unsafe-inline'"),
  'builds the script-src directive',
);
assert(csp.includes("img-src 'self' https:"), 'builds the img-src directive');

assert(security.isSafeUrl('https://example.com'), 'accepts an https URL');
assert(security.isSafeUrl('/about'), 'accepts a relative path');
assert(!security.isSafeUrl('javascript:alert(1)'), 'rejects a javascript: URL');

// ---------------------------------------------------------------------------
// 10. Service Registry
// ---------------------------------------------------------------------------

section('10. Service Registry');

const registry = new DefaultRuntimeServiceRegistry();

registry.register(assetResolver);
registry.register(localization);
registry.register(cache);
registry.register(mediaPipeline);
registry.register(seo);
registry.register(accessibility);
registry.register(analytics);
registry.register(performance);
registry.register(security);

assert(registry.has('asset-resolver'), 'registers the asset resolver');
assert(registry.has('localization'), 'registers the localization service');
assert(registry.has('cache'), 'registers the cache service');
assert(registry.has('media-pipeline'), 'registers the media pipeline');
assert(registry.has('seo'), 'registers the SEO service');
assert(registry.has('accessibility'), 'registers the accessibility service');
assert(registry.has('analytics'), 'registers the analytics service');
assert(registry.has('performance'), 'registers the performance service');
assert(registry.has('security'), 'registers the security service');

assert(registry.list().length === 9, 'lists all 9 registered services');

const resolvedSeo = registry.get('seo');
assert(resolvedSeo?.id === 'seo', 'resolves a service by id');

// Freezing.
registry.freeze();
assert(registry.isFrozen(), 'freezes the registry');

let frozeThrew = false;
try {
  registry.register(new DefaultCache());
} catch (error) {
  frozeThrew = error instanceof RuntimeServiceRegistryFrozenError;
}
assert(frozeThrew, 'throws RuntimeServiceRegistryFrozenError on register after freeze');

// ---------------------------------------------------------------------------
// 11. Runtime Coordination (Event Bus + Lifecycle + Health)
// ---------------------------------------------------------------------------

section('11. Runtime Coordination');

// 11a. RuntimeEventBus: event-driven observability.
const bus = new DefaultRuntimeEventBus();
const received: RuntimeEvent[] = [];
const unsubscribe = bus.subscribe((event) => received.push(event));

bus.emit({
  name: 'cache:miss',
  serviceId: 'cache',
  timestamp: '2026-01-01T00:00:00.000Z',
  payload: { key: 'hero' },
});
bus.emit({
  name: 'asset:resolved',
  serviceId: 'asset-resolver',
  timestamp: '2026-01-01T00:00:00.001Z',
});

assert(received.length === 2, 'delivers events to subscribers');
assert(received[0].name === 'cache:miss', 'delivers the first event name');
assert(received[0].serviceId === 'cache', 'records the emitting service id');
assert(received[1].name === 'asset:resolved', 'delivers the second event name');

unsubscribe();
bus.emit({
  name: 'seo:generated',
  serviceId: 'seo',
  timestamp: '2026-01-01T00:00:00.002Z',
});
assert(received.length === 2, 'unsubscribe stops further delivery');

// Fail-open: a throwing subscriber must not break other subscribers.
const bus2 = new DefaultRuntimeEventBus();
const healthy: string[] = [];
bus2.subscribe(() => {
  throw new Error('boom');
});
bus2.subscribe((event) => healthy.push(event.name));
bus2.emit({
  name: 'cache:hit',
  serviceId: 'cache',
  timestamp: '2026-01-01T00:00:00.000Z',
});
assert(healthy.length === 1, 'a throwing subscriber does not block other subscribers');

// 11b. Lifecycle orchestration: initializeAll / disposeAll.
// Wrapped in an async IIFE because top-level await is not supported in the
// CommonJS output format used by the test runner.
void (async () => {
  const lifecycleRegistry = new DefaultRuntimeServiceRegistry();
  lifecycleRegistry.register(new DefaultAssetResolver(config.resources.assets));
  lifecycleRegistry.register(new DefaultCache());
  lifecycleRegistry.register(new DefaultLocalization('en', { hi: 'Hi' }));

  await lifecycleRegistry.initializeAll();
  const initReport = lifecycleRegistry.healthReport();
  assert(initReport.status === 'healthy', 'all services are healthy after initializeAll');
  assert(initReport.total === 3, 'health report counts all 3 services');
  assert(initReport.healthy === 3, 'health report counts 3 healthy services');

  await lifecycleRegistry.disposeAll();
  const disposeReport = lifecycleRegistry.healthReport();
  assert(disposeReport.status === 'healthy', 'services remain healthy after disposeAll');
})();


// 11c. Health aggregation: worst status wins.
// A test-only service that can be marked degraded (via the protected hook).
class DegradableService extends BaseService {
  readonly id = 'degradable';
  degrade(): void {
    this.markDegraded();
  }
}

const degradedRegistry = new DefaultRuntimeServiceRegistry();
const degradable = new DegradableService();
degradable.degrade();
degradedRegistry.register(degradable);
degradedRegistry.register(new DefaultSeo());

const degradedReport = degradedRegistry.healthReport();
assert(degradedReport.status === 'degraded', 'aggregates to degraded when any service is degraded');
assert(degradedReport.degraded === 1, 'counts the degraded service');
assert(degradedReport.healthy === 1, 'counts the healthy service');


// ---------------------------------------------------------------------------
// 12. Migration Pipeline
// ---------------------------------------------------------------------------

section('12. Migration Pipeline');

const migrationPolicy = new SemanticVersionPolicy();
const migrationRegistry = new DefaultMigrationRuleRegistry();

// Chain: 1.0.0 -> 1.1.0 -> 2.0.0
migrationRegistry.register({
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  migrate: (payload) => {
    const p = payload as Record<string, unknown>;
    return { ...p, version: '1.1.0', added: true };
  },
});
migrationRegistry.register({
  fromVersion: '1.1.0',
  toVersion: '2.0.0',
  migrate: (payload) => {
    const p = payload as Record<string, unknown>;
    return { ...p, version: '2.0.0', upgraded: true };
  },
});

const migrationPipeline = new DefaultMigrationPipeline(
  migrationPolicy,
  migrationRegistry,
);

// Version policy: detection + comparison.
assert(
  migrationPolicy.detectVersion({ version: '1.0.0' }) === '1.0.0',
  'detects the version from a payload',
);
assert(
  migrationPolicy.detectVersion({}) === '0.0.0',
  'defaults to 0.0.0 when no version is present',
);
assert(
  migrationPolicy.compare('1.0.0', '2.0.0') < 0,
  'compares major versions',
);
assert(
  migrationPolicy.requiresMigration('1.0.0', '2.0.0'),
  'requires migration when current < target',
);
assert(
  !migrationPolicy.requiresMigration('2.0.0', '2.0.0'),
  'does not require migration when already at target',
);

// Registry: O(1) lookup.
assert(migrationRegistry.has('1.0.0'), 'registry has a rule for 1.0.0');
assert(migrationRegistry.get('1.0.0')?.toVersion === '1.1.0', 'registry resolves the next rule');
assert(!migrationRegistry.has('9.9.9'), 'registry has no rule for an unknown version');

// Pipeline: chains rules sequentially.
const migrated = migrationPipeline.migrate(
  { version: '1.0.0', name: 'x' },
  '2.0.0',
);
assert(migrated.migrated === true, 'pipeline reports that migration occurred');
assert(migrated.targetVersion === '2.0.0', 'pipeline reaches the target version');
assert(migrated.appliedRules.length === 2, 'pipeline applies both rules in sequence');
assert(
  (migrated.payload as Record<string, unknown>).version === '2.0.0',
  'pipeline produces the final migrated payload',
);
assert(
  (migrated.payload as Record<string, unknown>).added === true,
  'pipeline applies the first rule (added)',
);
assert(
  (migrated.payload as Record<string, unknown>).upgraded === true,
  'pipeline applies the second rule (upgraded)',
);

// No-op when already at target.
const noop = migrationPipeline.migrate({ version: '2.0.0' }, '2.0.0');
assert(noop.migrated === false, 'pipeline is a no-op when already at target');
assert(noop.appliedRules.length === 0, 'pipeline applies no rules when already at target');

// Chain gap: throws MigrationChainGapError.
const gapRegistry = new DefaultMigrationRuleRegistry();
gapRegistry.register({
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  migrate: (payload) => payload,
});
const gapPipeline = new DefaultMigrationPipeline(migrationPolicy, gapRegistry);
let gapThrew = false;
try {
  gapPipeline.migrate({ version: '1.0.0' }, '2.0.0');
} catch (error) {
  gapThrew = error instanceof MigrationChainGapError;
}
assert(gapThrew, 'throws MigrationChainGapError when the rule chain has a gap');

// ---------------------------------------------------------------------------
// 13. Feature Flags
// ---------------------------------------------------------------------------

section('13. Feature Flags');

const featureFlags = new DefaultFeatureFlagService();

featureFlags.register({
  id: 'new-checkout',
  rules: [{ attribute: 'tenant', value: 'acme' }],
});
featureFlags.register({
  id: 'beta',
  rules: [{ attribute: 'env', value: 'staging' }],
});
featureFlags.register({
  id: 'global-flag',
  rules: [],
});

assert(
  featureFlags.evaluate('new-checkout', { attributes: { tenant: 'acme' } }),
  'enables a flag when a rule matches the context',
);
assert(
  !featureFlags.evaluate('new-checkout', { attributes: { tenant: 'other' } }),
  'disables a flag when no rule matches the context',
);
assert(
  featureFlags.evaluate('beta', { attributes: { env: 'staging' } }),
  'enables a flag for the matching environment',
);
assert(
  !featureFlags.evaluate('beta', { attributes: { env: 'production' } }),
  'disables a flag for a non-matching environment',
);
assert(
  featureFlags.evaluate('global-flag', { attributes: {} }),
  'enables a flag with no rules (global flag)',
);
assert(
  !featureFlags.evaluate('unknown-flag', { attributes: {} }),
  'fails closed for an unknown flag',
);
assert(featureFlags.has('new-checkout'), 'has() returns true for a registered flag');
assert(!featureFlags.has('missing'), 'has() returns false for an unregistered flag');

// Determinism: same flag + context -> same result.
assert(
  featureFlags.evaluate('new-checkout', { attributes: { tenant: 'acme' } }) ===
    featureFlags.evaluate('new-checkout', { attributes: { tenant: 'acme' } }),
  'is deterministic (same flag + context -> same result)',
);

// ---------------------------------------------------------------------------
// 14. Diagnostics Pipeline
// ---------------------------------------------------------------------------

section('14. Diagnostics Pipeline');

const diagBus = new DefaultRuntimeEventBus();
const diagNormalizer = new DefaultNormalizer();
const diagSinks = new DefaultSinkRegistry();
const collected: string[] = [];
diagSinks.register({
  id: 'test',
  write: (record) => collected.push(record.name),
});
diagSinks.register(new StdoutSink());

const diagnostics = new DefaultDiagnosticsPipeline(diagBus, diagNormalizer, diagSinks);
assert(!diagnostics.isRunning(), 'pipeline is not running before start()');

diagnostics.start();
assert(diagnostics.isRunning(), 'pipeline is running after start()');

diagBus.emit({
  name: 'cache:miss',
  serviceId: 'cache',
  timestamp: '2026-01-01T00:00:00.000Z',
  payload: { key: 'hero' },
});
diagBus.emit({
  name: 'asset:resolve:fail',
  serviceId: 'asset-resolver',
  timestamp: '2026-01-01T00:00:00.001Z',
});

assert(collected.length === 2, 'routes normalized records to registered sinks');
assert(collected[0] === 'cache.miss', 'normalizes the event name (":" -> ".")');
assert(collected[1] === 'asset.resolve.fail', 'normalizes a multi-segment event name');

// Normalizer: level inference.
const errorRecord = diagNormalizer.normalize({
  name: 'asset:resolve:fail',
  serviceId: 'asset-resolver',
  timestamp: '2026-01-01T00:00:00.000Z',
});
assert(errorRecord.level === 'error', 'infers error level from a failing event');
assert(errorRecord.serviceId === 'asset-resolver', 'carries the service id through');

// SinkRegistry: O(1) lookup.
assert(diagSinks.get('test') !== undefined, 'sink registry resolves a registered sink');
assert(diagSinks.get('stdout') !== undefined, 'sink registry resolves the stdout sink');
assert(diagSinks.list().length === 2, 'sink registry lists all registered sinks');

// Fail-open: a throwing sink does not block other sinks.
const failOpenBus = new DefaultRuntimeEventBus();
const failOpenSinks = new DefaultSinkRegistry();
const receivedByHealthy: string[] = [];
failOpenSinks.register({
  id: 'throwing',
  write: () => {
    throw new Error('sink boom');
  },
});
failOpenSinks.register({
  id: 'healthy',
  write: (record) => receivedByHealthy.push(record.name),
});
const failOpenPipeline = new DefaultDiagnosticsPipeline(
  failOpenBus,
  diagNormalizer,
  failOpenSinks,
);
failOpenPipeline.start();
failOpenBus.emit({
  name: 'seo:generated',
  serviceId: 'seo',
  timestamp: '2026-01-01T00:00:00.000Z',
});
assert(
  receivedByHealthy.length === 1,
  'a throwing sink does not block other sinks from receiving the record',
);

failOpenPipeline.stop();
assert(!failOpenPipeline.isRunning(), 'pipeline stops after stop()');

// ---------------------------------------------------------------------------
// 15. Execution Control (TraceContext, CancellationToken, Deadline)
// ---------------------------------------------------------------------------

section('15. Execution Control');

// 15a. TraceContext: rich, nested, deterministic.
const rootTrace = createTraceContext({ requestId: 'req-1', tenantId: 'acme' });
assert(rootTrace.traceId.length > 0, 'creates a root trace context with a trace id');
assert(rootTrace.parentTraceId === undefined, 'root trace has no parent trace');
assert(rootTrace.requestId === 'req-1', 'root trace carries the request id');
assert(rootTrace.tenantId === 'acme', 'root trace carries the tenant id');
assert(rootTrace.timestamp.length > 0, 'root trace records a timestamp');

const childTrace = createChildTraceContext(rootTrace);
assert(childTrace.parentTraceId === rootTrace.traceId, 'child trace records the parent trace id');
assert(childTrace.requestId === 'req-1', 'child trace inherits the request id');
assert(childTrace.tenantId === 'acme', 'child trace inherits the tenant id');
assert(childTrace.traceId !== rootTrace.traceId, 'child trace generates a distinct trace id');

// 15b. CancellationToken: cooperative cancellation.
const token = new DefaultCancellationToken();
assert(!token.isCancelled(), 'token is not cancelled initially');
token.cancel();
assert(token.isCancelled(), 'token is cancelled after cancel()');

// CancelledError is thrown when a cancelled token is checked.
const cancelledToken = new DefaultCancellationToken();
cancelledToken.cancel();
let cancelledThrew = false;
try {
  cancelledToken.throwIfCancelled();
} catch (error) {
  cancelledThrew = error instanceof CancelledError;
}
assert(cancelledThrew, 'throws CancelledError when the token is cancelled');

// 15c. Deadline: time-bounded execution.
const deadline = new DefaultDeadline(1000);
assert(deadline.isExpired() === false, 'a fresh deadline is not expired');
assert(deadline.remainingMs() > 0, 'a fresh deadline has remaining time');

const expiredDeadline = new DefaultDeadline(-1);
assert(expiredDeadline.isExpired(), 'a negative deadline is expired');
let deadlineThrew = false;
try {
  expiredDeadline.throwIfExpired();
} catch (error) {
  deadlineThrew = error instanceof DeadlineExceededError;
}
assert(deadlineThrew, 'throws DeadlineExceededError when the deadline is expired');

// 15d. ExecutionContext: composes trace + cancellation + deadline.
const ctx = createExecutionContext(rootTrace, {
  cancellation: new DefaultCancellationToken(),
  deadline: new DefaultDeadline(5000),
});
assert(ctx.trace.traceId === rootTrace.traceId, 'execution context carries the trace');
assert(ctx.cancellation?.isCancelled() === false, 'execution context carries a live token');
assert(ctx.deadline?.isExpired() === false, 'execution context carries a live deadline');

// ---------------------------------------------------------------------------
// 16. Metrics Architecture (Collector Pattern)
// ---------------------------------------------------------------------------

section('16. Metrics Architecture');

const metricsSinks = new DefaultMetricsSinkRegistry();
const metricSamples: string[] = [];
metricsSinks.register('test', {
  write: (samples) => {
    for (const sample of samples) {
      metricSamples.push(`${sample.name}:${sample.value}`);
    }
  },
});
metricsSinks.register('stdout', new StdoutMetricsSink(() => {
  /* no-op stdout sink for the test */
}));


const metrics = new DefaultMetricsCollector(metricsSinks);

metrics.increment('cache.hits');
metrics.increment('cache.hits');
metrics.setGauge('active.requests', 3);

// Aggregation: counters sum, gauges take the latest value.
const snapshot = metrics.snapshot();
assert(snapshot.length === 2, 'aggregates counters and gauges into samples');
const hits = snapshot.find((s) => s.name === 'cache.hits');
assert(hits?.value === 2, 'sums counter increments');
assert(hits?.type === 'counter', 'labels the counter sample as a counter');
const gauge = snapshot.find((s) => s.name === 'active.requests');
assert(gauge?.value === 3, 'records the gauge value');
assert(gauge?.type === 'gauge', 'labels the gauge sample as a gauge');

// Flush: routes aggregated samples to registered sinks.
metrics.flush();
assert(metricSamples.length === 2, 'flushes aggregated samples to registered sinks');
assert(metricSamples[0] === 'cache.hits:2', 'flushes the aggregated counter');
assert(metricSamples[1] === 'active.requests:3', 'flushes the gauge');

// After flush, the aggregation state is reset.
assert(metrics.snapshot().length === 0, 'resets aggregation state after flush');

// SinkRegistry: O(1) lookup.
assert(metricsSinks.get('test') !== undefined, 'metrics sink registry resolves a registered sink');
assert(metricsSinks.get('stdout') !== undefined, 'metrics sink registry resolves the stdout sink');

// Fail-open: a throwing sink does not block other sinks.
const failOpenMetricsSinks = new DefaultMetricsSinkRegistry();
const healthyMetricSamples: string[] = [];
failOpenMetricsSinks.register('throwing', {
  write: () => {
    throw new Error('metric sink boom');
  },
});
failOpenMetricsSinks.register('healthy', {
  write: (samples) => {
    for (const sample of samples) {
      healthyMetricSamples.push(sample.name);
    }
  },
});
const failOpenMetrics = new DefaultMetricsCollector(failOpenMetricsSinks);
failOpenMetrics.increment('seo.generated');
failOpenMetrics.flush();
assert(
  healthyMetricSamples.length === 1,
  'a throwing metrics sink does not block other sinks',
);

// ---------------------------------------------------------------------------
// 17. Resilience Layer (CircuitBreaker, RetryPolicy, ExternalClient)
// ---------------------------------------------------------------------------

section('17. Resilience Layer');

// 17a. CircuitBreaker: closed -> open -> half-open.
const breaker = new DefaultCircuitBreaker({
  failureThreshold: 2,
  successThreshold: 1,
  openTimeoutMs: 1000,
});

assert(breaker.state() === 'closed', 'circuit starts closed');
assert(breaker.execute(() => 'ok') === 'ok', 'closed circuit executes operations');

breaker.recordFailure();
breaker.recordFailure();
assert(breaker.state() === 'open', 'circuit opens after the failure threshold');

let circuitThrew = false;
try {
  breaker.execute(() => 'should not run');
} catch (error) {
  circuitThrew = error instanceof CircuitOpenError;
}
assert(circuitThrew, 'open circuit fails fast with CircuitOpenError');

// After the open timeout elapses, the circuit transitions to half-open.
// A mutable clock lets us advance time deterministically.
let clock = 1000;
const advancedBreaker = new DefaultCircuitBreaker(
  { failureThreshold: 1, successThreshold: 1, openTimeoutMs: 100 },
  () => clock,
);
advancedBreaker.recordFailure();
assert(advancedBreaker.state() === 'open', 'circuit opens after a single failure');
clock = 1200; // advance past the 100ms open timeout
assert(
  advancedBreaker.state() === 'half-open',
  'circuit transitions to half-open after the timeout',
);


// 17b. RetryPolicy: retries transient failures with backoff.
const retryPolicy = new DefaultRetryPolicy(
  { maxRetries: 2, baseDelayMs: 1, backoffMultiplier: 2 },
  () => {
    /* no-op sleep for deterministic testing */
  },
);

let attempts = 0;
const retried = retryPolicy.execute(() => {
  attempts++;
  if (attempts < 3) {
    throw new Error('transient');
  }
  return 'ok';
});
assert(retried === 'ok', 'retries a transient failure until success');
assert(attempts === 3, 'retries exactly until the operation succeeds');

// RetriesExhaustedError when all attempts fail.
const failingPolicy = new DefaultRetryPolicy(
  { maxRetries: 1, baseDelayMs: 1, backoffMultiplier: 2 },
  () => {
    /* no-op sleep */
  },
);
let exhaustedThrew = false;
try {
  failingPolicy.execute(() => {
    throw new Error('always fails');
  });
} catch (error) {
  exhaustedThrew = error instanceof RetriesExhaustedError;
}
assert(exhaustedThrew, 'throws RetriesExhaustedError when all attempts fail');

// 17c. ResilientExternalClient: composes retry + circuit breaker at the boundary.
const innerClient: ExternalClient = {
  fetch: (key) => {
    if (key === 'fail') {
      throw new Error('external down');
    }
    return `data:${key}`;
  },
};
const resilientClient = new ResilientExternalClient(
  innerClient,
  new DefaultCircuitBreaker({ failureThreshold: 3, successThreshold: 1, openTimeoutMs: 1000 }),
  new DefaultRetryPolicy(
    { maxRetries: 1, baseDelayMs: 1, backoffMultiplier: 2 },
    () => {
      /* no-op sleep */
    },
  ),
);

assert(resilientClient.fetch('hero') === 'data:hero', 'external client fetches through the resilience layer');


// ---------------------------------------------------------------------------
// 18. Service Scope (Singleton / Scoped / Transient)
// ---------------------------------------------------------------------------

section('18. Service Scope');

// A scoped service declares its lifecycle scope in metadata.
class ScopedService extends BaseService {
  readonly id = 'scoped-service';
  protected get metadata() {
    return {
      id: this.id,
      version: '1.0.0',
      description: 'A scoped runtime service.',
      scope: 'scoped' as const,
      dependencies: [],
    };
  }
}

const scopedService = new ScopedService();
assert(scopedService.getMetadata().scope === 'scoped', 'declares a scoped lifecycle');
assert(scopedService.supports('scoped-service'), 'exposes its id as a capability');

// A transient service declares its lifecycle scope in metadata.
class TransientService extends BaseService {
  readonly id = 'transient-service';
  protected get metadata() {
    return {
      id: this.id,
      version: '1.0.0',
      description: 'A transient runtime service.',
      scope: 'transient' as const,
      dependencies: [],
    };
  }
}

const transientService = new TransientService();
assert(transientService.getMetadata().scope === 'transient', 'declares a transient lifecycle');

// A default service (no override) defaults to singleton.
class SingletonService extends BaseService {
  readonly id = 'singleton-service';
}
const singletonService = new SingletonService();
assert(singletonService.getMetadata().scope === 'singleton', 'defaults to a singleton lifecycle');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------


section('Summary');


console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Services registered: ${registry.list().length}`);

if (failed > 0) {
  console.error('\nRuntime Services test FAILED.');
  process.exit(1);
}

console.log('\nRuntime Services test PASSED.');
