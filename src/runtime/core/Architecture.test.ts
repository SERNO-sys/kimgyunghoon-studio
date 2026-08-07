/**
 * AWIE V2 - Phase 16.2: Application Runtime Foundation - Architecture tests.
 *
 * These tests enforce the CORE CONSTITUTION boundary:
 *
 *   "The Runtime receives only execution contracts. The Runtime never
 *    resolves, edits, composes, validates, or decides."
 *
 * Concretely, this means:
 *   - The Runtime (src/runtime) MUST NEVER import or understand CMS models
 *     (Project, LocaleVariant, Brand, PluginSet, ThemePointer, Snapshot).
 *   - Only the resolved execution contract (ThemeConfig) may cross the
 *     CMS -> Runtime boundary.
 *
 * This test scans every source file under src/runtime and asserts that NONE of
 * them import from src/cms (or any CMS model path). It also asserts that the
 * Runtime Core does NOT depend on any UI framework (React, Vue, etc.).
 *
 * Run with: npx tsx src/runtime/core/Architecture.test.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
// Helpers
// ---------------------------------------------------------------------------

const RUNTIME_DIR = join(__dirname, '..');

/**
 * Recursively collects all .ts/.tsx source files under a directory.
 */
function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Extracts the import specifiers from a source file.
 */
function extractImportSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const importRe =
    /(?:import\s+(?:type\s+)?[\s\S]*?from\s+|import\s+(?:type\s+)?\()\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(source)) !== null) {
    specifiers.push(match[1]);
  }
  // Also capture dynamic imports.
  const dynamicRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicRe.exec(source)) !== null) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function run(): void {
  const files = collectSourceFiles(RUNTIME_DIR);

  section('The Runtime NEVER imports from src/cms (CMS boundary)');
  {
    let violations = 0;
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const specifiers = extractImportSpecifiers(source);
      for (const spec of specifiers) {
        // Any import that resolves into the CMS tree is a violation.
        if (spec.includes('src/cms') || spec.includes('/cms/') || spec.includes('../cms')) {
          violations += 1;
          console.error(`  VIOLATION: ${file} imports '${spec}'`);
        }
      }
    }
    assert(violations === 0, `no src/runtime file imports from src/cms (${violations} violations)`);
  }

  section('The Runtime Core does NOT depend on any UI framework');
  {
    const coreFiles = files.filter((f) => f.includes(`${join('core', '')}`));
    let violations = 0;
    for (const file of coreFiles) {
      const source = readFileSync(file, 'utf8');
      const specifiers = extractImportSpecifiers(source);
      for (const spec of specifiers) {
        if (spec === 'react' || spec === 'vue' || spec === 'svelte' || spec === 'preact') {
          violations += 1;
          console.error(`  VIOLATION: ${file} imports UI framework '${spec}'`);
        }
      }
    }
    assert(
      violations === 0,
      `Runtime Core does NOT depend on any UI framework (${violations} violations)`,
    );
  }

  section('The Runtime Core is present and self-contained');
  {
    assert(files.length > 0, 'src/runtime contains source files');
    const hasTypes = files.some((f) => f.endsWith('types.ts'));
    const hasStateStore = files.some((f) => f.endsWith('StateStore.ts'));
    const hasHydration = files.some((f) => f.endsWith('HydrationEngine.ts'));
    const hasRegistry = files.some((f) => f.endsWith('AdapterRegistry.ts'));
    assert(hasTypes, 'Runtime Core defines types.ts');
    assert(hasStateStore, 'Runtime Core defines StateStore.ts');
    assert(hasHydration, 'Runtime Core defines HydrationEngine.ts');
    assert(hasRegistry, 'Runtime Core defines AdapterRegistry.ts');
  }

  section('ADR-007: OSS libraries are isolated behind AWIE adapters');
  {
    // The AWIE-owned adapter implementations are the ONLY files permitted to
    // wrap the OSS libraries. They may live in core/ or providers/.
    const allowedAdapterFiles = files.filter(
      (f) => f.endsWith('ZustandStateStore.ts') || f.endsWith('QueryClientLiveDataAdapter.ts'),
    );

    // The Core Constitution (HydrationEngine, AdapterRegistry, StateStore
    // contract, types) MUST NOT import the OSS libraries directly. Only the
    // AWIE-owned adapters may wrap them.
    const coreFiles = files.filter((f) => f.includes(`${join('core', '')}`));
    let coreViolations = 0;
    for (const file of coreFiles) {
      if (allowedAdapterFiles.includes(file)) {
        continue; // the adapter is the sanctioned wrapper
      }
      const source = readFileSync(file, 'utf8');
      const specifiers = extractImportSpecifiers(source);
      for (const spec of specifiers) {
        if (spec === 'zustand' || spec.startsWith('@tanstack/')) {
          coreViolations += 1;
          console.error(`  VIOLATION: ${file} imports OSS library '${spec}' directly`);
        }
      }
    }
    assert(
      coreViolations === 0,
      `Runtime Core never imports zustand/@tanstack directly (${coreViolations} violations)`,
    );

    // The OSS libraries may ONLY appear inside the adapter implementations.
    const adapterFiles = files.filter((f) => f.includes(`${join('providers', '')}`));
    let adapterViolations = 0;
    for (const file of adapterFiles) {
      const source = readFileSync(file, 'utf8');
      const specifiers = extractImportSpecifiers(source);
      const usesOss = specifiers.some(
        (spec) => spec === 'zustand' || spec.startsWith('@tanstack/'),
      );
      if (usesOss && !allowedAdapterFiles.includes(file)) {
        adapterViolations += 1;
        console.error(`  VIOLATION: ${file} imports OSS library outside the adapter boundary`);
      }
    }
    assert(
      adapterViolations === 0,
      `OSS libraries appear ONLY in the AWIE adapter implementations (${adapterViolations} violations)`,
    );

    // The OSS libraries MUST NOT leak into the CMS tree.
    const cmsDir = join(__dirname, '..', '..', 'cms');
    let cmsViolations = 0;
    try {
      for (const file of collectSourceFiles(cmsDir)) {
        const source = readFileSync(file, 'utf8');
        const specifiers = extractImportSpecifiers(source);
        for (const spec of specifiers) {
          if (spec === 'zustand' || spec.startsWith('@tanstack/')) {
            cmsViolations += 1;
            console.error(`  VIOLATION: ${file} imports OSS library '${spec}'`);
          }
        }
      }
    } catch {
      // src/cms may not exist in some contexts; treat as no violations.
    }
    assert(
      cmsViolations === 0,
      `src/cms never imports zustand/@tanstack (${cmsViolations} violations)`,
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run();
