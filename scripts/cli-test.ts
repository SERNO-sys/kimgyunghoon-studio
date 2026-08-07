/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Test script.
 *
 * Verifies the CLI framework, validator, and commands work end-to-end.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. This test
 *   exercises the CLI's OFFLINE validation and command dispatch only.
 */

import { runCli, buildRegistry } from '../src/cli';
import { validatePlugin } from '../src/cli/validator';
import { scanForCoreImports } from '../src/cli/validator';

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

// --- Test 1: Registry has all built-in commands ---
console.log('\n[1] Registry');
const registry = buildRegistry();
assert(registry.has('create'), 'registry has "create"');
assert(registry.has('new'), 'registry has "new"');
assert(registry.has('validate'), 'registry has "validate"');
assert(registry.has('check'), 'registry has "check"');
assert(registry.has('build'), 'registry has "build"');
assert(registry.has('install'), 'registry has "install"');
assert(registry.has('doctor'), 'registry has "doctor"');
assert(registry.list().length === 7, 'registry has exactly 7 commands');


// --- Test 2: CLI help ---
console.log('\n[2] CLI help');
const helpExit = runCli(['--help'], {
  info: () => {},
  success: () => {},
  warn: () => {},
  error: () => {},
  header: () => {},
});
assert(helpExit === 0, '--help exits 0');

// --- Test 3: Unknown command ---
console.log('\n[3] Unknown command');
const unknownExit = runCli(['nope'], {
  info: () => {},
  success: () => {},
  warn: () => {},
  error: () => {},
  header: () => {},
});
assert(unknownExit === 1, 'unknown command exits 1');

// --- Test 4: create command ---
console.log('\n[4] create command');
const createExit = runCli(['create', 'plugin', 'My Cool Plugin'], {
  info: () => {},
  success: () => {},
  warn: () => {},
  error: () => {},
  header: () => {},
});
assert(createExit === 0, 'create plugin exits 0');

// --- Test 5: create command missing args ---
console.log('\n[5] create command missing args');
const createBadExit = runCli(['create'], {
  info: () => {},
  success: () => {},
  warn: () => {},
  error: () => {},
  header: () => {},
});
assert(createBadExit === 1, 'create without args exits 1');

// --- Test 6: doctor command ---
console.log('\n[6] doctor command');
const doctorExit = runCli(['doctor'], {
  info: () => {},
  success: () => {},
  warn: () => {},
  error: () => {},
  header: () => {},
});
assert(doctorExit === 0, 'doctor exits 0');

// --- Test 7: validate command ---
console.log('\n[7] validate command');
const validateExit = runCli(['validate', 'awie.plugin.json'], {
  info: () => {},
  success: () => {},
  warn: () => {},
  error: () => {},
  header: () => {},
});
assert(validateExit === 1, 'validate empty manifest exits 1 (invalid)');

// --- Test 8: zero-core-imports scanner ---
console.log('\n[8] zero-core-imports scanner');
const cleanFiles = {
  'src/index.ts': `import type { LoadedPluginArtifacts } from '@awie/sdk';
export const artifacts: LoadedPluginArtifacts = { renderers: [], themes: [], components: [] };`,
};
const cleanFindings = scanForCoreImports(cleanFiles);
assert(cleanFindings.length === 0, 'clean plugin has no forbidden imports');

const dirtyFiles = {
  'src/index.ts': `import { something } from '../src/lib/runtime';
import { other } from '../src/lib/theme-engine';`,
};
const dirtyFindings = scanForCoreImports(dirtyFiles);
assert(dirtyFindings.length === 2, 'dirty plugin flags 2 forbidden imports');

// --- Test 9: validatePlugin with valid manifest ---
console.log('\n[9] validatePlugin valid manifest');
const validManifest = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  core: { version: '^2.0.0' },
  capabilities: { renderers: [], themes: [], components: [] },
};
const validResult = validatePlugin(
  { manifest: validManifest, files: cleanFiles },
  { coreVersion: '2.0.0', strict: true },
);
assert(validResult.ok === true, 'valid plugin passes validation');

// --- Test 10: validatePlugin with forbidden import ---
console.log('\n[10] validatePlugin forbidden import');
const invalidResult = validatePlugin(
  { manifest: validManifest, files: dirtyFiles },
  { coreVersion: '2.0.0', strict: true },
);
assert(invalidResult.ok === false, 'plugin with core import fails validation');
assert(invalidResult.errorCount === 2, 'plugin has 2 errors');

// --- Test 11: validatePlugin with incompatible core version ---
console.log('\n[11] validatePlugin incompatible core version');
const incompatibleResult = validatePlugin(
  { manifest: { ...validManifest, core: { version: '^3.0.0' } }, files: cleanFiles },
  { coreVersion: '2.0.0', strict: true },
);
assert(incompatibleResult.ok === false, 'incompatible core version fails');

// --- Test 12: validatePlugin with invalid manifest ---
console.log('\n[12] validatePlugin invalid manifest');
const invalidManifestResult = validatePlugin(
  { manifest: { id: '' }, files: cleanFiles },
  { coreVersion: '2.0.0', strict: true },
);
assert(invalidManifestResult.ok === false, 'invalid manifest fails');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
