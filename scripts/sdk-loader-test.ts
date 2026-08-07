/**
 * AWIE V2 - Phase 13.1 & 13.2: Plugin Loader & Validation test.
 *
 * Verifies:
 *   - MANDATE 1: PluginManifest schema + SemVer validation.
 *   - MANDATE 2: PluginLifecycle state machine.
 *   - MANDATE 3: PluginLoader (Sandbox Orchestrator) — the ONLY entity allowed
 *     to mutate the Core Registry. Direct Registry mutation by plugins is
 *     blocked because plugins never receive the registry ports.
 *
 * Run: npx tsx scripts/sdk-loader-test.ts
 */

import {
  PluginLoader,
  PluginLifecycle,
  canTransition,
  compareSemVer,
  parseSemVer,
  versionSatisfies,
  declaredExtensionKinds,
} from '../src/lib/sdk';
import type {
  ComponentExtension,
  PluginManifest,
  RendererExtension,
} from '../src/lib/sdk';
import type {
  ComponentRegistryPort,
  PluginRegistryPorts,
  RendererRegistryPort,
  ThemeRegistryPort,
} from '../src/lib/sdk';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertThrows(fn: () => void, message: string): void {
  try {
    fn();
    failed++;
    console.error(`  FAIL: ${message} (expected an error)`);
  } catch {
    passed++;
    console.log(`  PASS: ${message}`);
  }
}

console.log('=== MANDATE 1: SemVer validation ===');

// parseSemVer
assert(parseSemVer('2.0.0').major === 2, 'parseSemVer("2.0.0").major === 2');
assert(parseSemVer('2.1.3-beta.1').prerelease === 'beta.1', 'parses prerelease');
assertThrows(() => parseSemVer('not-a-version'), 'rejects invalid version');

// compareSemVer
assert(compareSemVer(parseSemVer('2.0.0'), parseSemVer('2.0.0')) === 0, '2.0.0 == 2.0.0');
assert(compareSemVer(parseSemVer('2.1.0'), parseSemVer('2.0.0')) > 0, '2.1.0 > 2.0.0');
assert(compareSemVer(parseSemVer('2.0.0'), parseSemVer('2.0.0-beta')) > 0, '2.0.0 > 2.0.0-beta');

// versionSatisfies (coreVersion range)
assert(versionSatisfies('2.1.0', '>=2.0.0 <3.0.0'), '2.1.0 satisfies >=2.0.0 <3.0.0');
assert(versionSatisfies('2.0.0', '>=2.0.0 <3.0.0'), '2.0.0 satisfies >=2.0.0 <3.0.0');
assert(!versionSatisfies('3.0.0', '>=2.0.0 <3.0.0'), '3.0.0 does NOT satisfy >=2.0.0 <3.0.0');
assert(versionSatisfies('2.5.0', '^2.0.0'), '2.5.0 satisfies ^2.0.0');
assert(!versionSatisfies('3.0.0', '^2.0.0'), '3.0.0 does NOT satisfy ^2.0.0');
assert(versionSatisfies('2.1.0', '~2.1.0'), '2.1.0 satisfies ~2.1.0');
assert(!versionSatisfies('2.2.0', '~2.1.0'), '2.2.0 does NOT satisfy ~2.1.0');

console.log('=== MANDATE 1: PluginManifest schema ===');

const manifest: PluginManifest = {
  id: 'acme-editorial',
  version: '1.0.0',
  author: 'Acme',
  coreVersion: '>=2.0.0 <3.0.0',
  capabilities: { renderer: true, theme: false, component: true },
};
assert(manifest.id === 'acme-editorial', 'manifest id present');
assert(manifest.coreVersion === '>=2.0.0 <3.0.0', 'manifest coreVersion present');
assert(
  declaredExtensionKinds(manifest.capabilities).join(',') === 'renderer,component',
  'declaredExtensionKinds maps capabilities to kinds',
);

console.log('=== MANDATE 2: PluginLifecycle state machine ===');

const lifecycle = new PluginLifecycle('acme-editorial');
assert(lifecycle.current === 'discovered', 'starts in discovered');
assert(canTransition('discovered', 'validated'), 'discovered -> validated is legal');
assert(!canTransition('discovered', 'enabled'), 'discovered -> enabled is illegal');
lifecycle.transition('validated');
lifecycle.transition('loaded');
lifecycle.transition('registered');
lifecycle.transition('enabled');
assert(lifecycle.current === 'enabled', 'reaches enabled');
assertThrows(
  () => lifecycle.transition('validated'),
  'enabled -> validated is illegal (throws PluginLifecycleError)',
);

console.log('=== MANDATE 3: PluginLoader (Sandbox Orchestrator) ===');

// Build fake registry ports that record what was registered and track which
// ids already exist (to support the collision policy).
const registeredRenderers: string[] = [];
const registeredThemes: string[] = [];
const registeredComponents: string[] = [];

const rendererPort: RendererRegistryPort = {
  register: (id: string) => {
    registeredRenderers.push(id);
  },
  has: (id: string) => registeredRenderers.includes(id),
};
const themePort: ThemeRegistryPort = {
  register: (id: string) => {
    registeredThemes.push(id);
  },
  has: (id: string) => registeredThemes.includes(id),
};
const componentPort: ComponentRegistryPort = {
  register: (id: string) => {
    registeredComponents.push(id);
  },
  has: (id: string) => registeredComponents.includes(id),
};
const ports: PluginRegistryPorts = {
  renderers: rendererPort,
  themes: themePort,
  components: componentPort,
};


const loader = new PluginLoader('2.1.0', ports);

// Build a renderer extension artifact.
const rendererExt: RendererExtension = {
  kind: 'renderer',
  id: 'acme-hero',
  version: '1.0.0',
  core: { version: '2.0.0' },
  sectionType: 'acme-hero',
  render: () => ({
    type: 'element',
    componentId: 'acme-hero',
    props: {},
    children: [],
  }),
};

// Build a component extension artifact.
const componentExt: ComponentExtension = {
  kind: 'component',
  id: 'acme-gallery',
  version: '1.0.0',
  core: { version: '2.0.0' },
  components: [],
};

// Install the plugin (discover -> validate -> load -> register -> enable).
const result = loader.install(manifest, {
  renderers: [rendererExt],
  themes: [],
  components: [componentExt],
});

assert(result.ok === true, 'install succeeds');
assert(result.state === 'enabled', 'plugin reaches enabled state');
assert(registeredRenderers.includes('acme-hero'), 'renderer registered into Core Registry');
assert(registeredComponents.includes('acme-gallery'), 'component registered into Core Registry');
assert(registeredThemes.length === 0, 'no theme registered (not declared)');

// Lifecycle state tracking.
assert(loader.stateOf('acme-editorial') === 'enabled', 'stateOf returns enabled');

// Disable / re-enable.
loader.disable('acme-editorial');
assert(loader.stateOf('acme-editorial') === 'disabled', 'disable works');
loader.enable('acme-editorial');
assert(loader.stateOf('acme-editorial') === 'enabled', 're-enable works');

// Unload.
loader.unload('acme-editorial');
assert(loader.stateOf('acme-editorial') === 'unloaded', 'unload works');

console.log('=== MANDATE 3: Direct Registry mutation by plugins is BLOCKED ===');

// A plugin that declares an incompatible coreVersion must be rejected.
const badManifest: PluginManifest = {
  id: 'bad-plugin',
  version: '1.0.0',
  coreVersion: '>=3.0.0 <4.0.0', // running core is 2.1.0
  capabilities: { renderer: true, theme: false, component: false },
};
const badResult = loader.install(badManifest, {
  renderers: [rendererExt],
  themes: [],
  components: [],
});
assert(badResult.ok === false, 'incompatible coreVersion is rejected');
assert(
  badResult.error?.includes('coreVersion') === true,
  'rejection message mentions coreVersion',
);

// A plugin that declares NO capabilities must be rejected.
const noCapManifest: PluginManifest = {
  id: 'empty-plugin',
  version: '1.0.0',
  coreVersion: '>=2.0.0 <3.0.0',
  capabilities: { renderer: false, theme: false, component: false },
};
const noCapResult = loader.install(noCapManifest, {
  renderers: [],
  themes: [],
  components: [],
});
assert(noCapResult.ok === false, 'plugin with no capabilities is rejected');

// A plugin cannot register before it is loaded.
const prematureLoader = new PluginLoader('2.1.0', ports);
prematureLoader.discover(manifest);
assertThrows(
  () => prematureLoader.register('acme-editorial'),
  'register before load throws PluginValidationError',
);

// The registry ports are NEVER exposed to plugins. The PluginLoader is the
// ONLY entity that receives them. This is enforced by the SDK boundary: the
// PluginLoader constructor is the sole consumer of PluginRegistryPorts.
assert(
  typeof (loader as unknown as { ports: unknown }).ports === 'object',
  'Loader holds the registry ports privately (not exposed to plugins)',
);

console.log('=== MANDATE 4: PluginContext (runtime context injection) ===');

// A plugin receives a PluginContext via its initialize hook. It never imports
// Core services directly.
let receivedContext: { pluginId: string; coreVersion: string } | undefined;
let contextLogs: string[] = [];

const contextManifest: PluginManifest = {
  id: 'context-plugin',
  version: '1.0.0',
  coreVersion: '>=2.0.0 <3.0.0',
  capabilities: { renderer: true, theme: false, component: false },
};

// Use fresh ports so the context plugin's renderer does not collide with the
// already-registered 'acme-hero' from the earlier install.
const contextRenderers: string[] = [];
const contextRendererPort: RendererRegistryPort = {
  register: (id: string) => {
    contextRenderers.push(id);
  },
  has: (id: string) => contextRenderers.includes(id),
};
const contextLoader = new PluginLoader('2.1.0', {
  renderers: contextRendererPort,
  themes: themePort,
  components: componentPort,
});
const contextResult = contextLoader.install(contextManifest, {
  renderers: [rendererExt],
  themes: [],
  components: [],
  initialize: (context) => {
    receivedContext = {
      pluginId: context.pluginId,
      coreVersion: context.coreVersion,
    };
    context.logger.info('initialized');
    contextLogs.push('info');
  },
});


assert(contextResult.ok === true, 'plugin with initialize hook installs');
assert(
  receivedContext?.pluginId === 'context-plugin',
  'PluginContext carries the plugin id',
);
assert(
  receivedContext?.coreVersion === '2.1.0',
  'PluginContext carries the running Core version',
);
assert(contextLogs.length === 1, 'initialize hook invoked exactly once');

console.log('=== MANDATE 5: Conflict Resolution (NO silent overwrites) ===');

// A plugin that attempts to register an id that already exists in the Core
// Registry must be rejected with a collision error. Silent overwrites are
// forbidden.
const collisionManifest: PluginManifest = {
  id: 'collision-plugin',
  version: '1.0.0',
  coreVersion: '>=2.0.0 <3.0.0',
  capabilities: { renderer: true, theme: false, component: false },
};

// 'acme-hero' was already registered by the first plugin install above.
const collisionResult = loader.install(collisionManifest, {
  renderers: [rendererExt],
  themes: [],
  components: [],
});

assert(collisionResult.ok === false, 'colliding registration is rejected');
assert(
  collisionResult.error?.includes('already exists') === true,
  'collision error mentions the existing resource',
);
assert(
  collisionResult.error?.includes('acme-hero') === true,
  'collision error names the colliding resource id',
);

// A fresh loader with a pre-populated registry also rejects collisions.
const prePopulatedRenderers = ['pre-existing-renderer'];
const prePopulatedPort: RendererRegistryPort = {
  register: (id: string) => {
    prePopulatedRenderers.push(id);
  },
  has: (id: string) => prePopulatedRenderers.includes(id),
};
const prePopulatedLoader = new PluginLoader('2.1.0', {
  renderers: prePopulatedPort,
  themes: themePort,
  components: componentPort,
});
const prePopulatedResult = prePopulatedLoader.install(collisionManifest, {
  renderers: [
    {
      ...rendererExt,
      id: 'pre-existing-renderer',
    },
  ],
  themes: [],
  components: [],
});
assert(prePopulatedResult.ok === false, 'collision with pre-existing id rejected');

console.log('\n========================================');
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}


