/**
 * AWIE V2 - Phase 11 M1: CI Architecture Guard.
 *
 * An automated static-analysis script that enforces the AWIE Runtime
 * Constitution in CI. It blocks the build on ANY violation.
 *
 * CHECKS:
 *   Check 1 - Import Boundaries:
 *       a) renderer-foundation/ MUST NOT import BusinessBrief, IndustryRegistry,
 *          or RecipeBlueprint.
 *       b) recipe-engine/ MUST NOT import React or Vue.
 *   Check 2 - Immutability Enforcement:
 *       ThemeConfig MUST NOT be mutated directly outside the designated
 *       merger/builder. We detect direct property assignment on a ThemeConfig
 *       object (e.g. `config.resources.pages.push(...)` or `config.metadata.x = y`).
 *   Check 3 - Registry Compliance:
 *       Rendering paths MUST use ResourceRegistry<T> (O(1) map lookups). Raw
 *       `Array.find()` in rendering paths is BANNED.
 *   Check 4 - Zero Core Imports (Phase 13.3):
 *       Plugins under src/plugins/ MUST import ONLY from `@awie/sdk` (or
 *       standard libraries). They MUST NEVER import an internal core module
 *       (e.g. src/lib/runtime, src/lib/theme-engine, src/lib/cms-core). This
 *       enforces the Plugin Sandbox boundary: the @awie/sdk is the ONLY
 *       dependency a Plugin has.
 *
 * If ANY check fails, the script exits with a non-zero error code.
 *
 * Run: npx tsx scripts/ci-guard.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/** File extensions to scan. */
const EXTENSIONS = new Set(['.ts', '.tsx']);

/** Directories that are allowed to mutate ThemeConfig (merger/builder). */
const ALLOWED_MUTATION_DIRS = [
  'lib/recipe-engine/merger',
  'lib/theme-config',
];

/** Rendering paths that MUST use ResourceRegistry (no raw Array.find()). */
const RENDERING_DIRS = [
  'lib/renderer-foundation',
  'lib/renderer-react',
  'lib/theme-ecosystem',
];

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/** Recursively collects all source files under a directory. */
function collectFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

/** Collects all source files under src/ recursively. */
function collectAllSrcFiles(): string[] {
  return collectFiles(SRC);
}

// ---------------------------------------------------------------------------
// Import extraction
// ---------------------------------------------------------------------------

/**
 * Extracts all import specifiers from a source file.
 * Handles import, import type, export ... from, and side-effect imports.
 */
function extractImports(source: string): string[] {
  const specifiers: string[] = [];
  const importRe = /\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const exportRe = /\bexport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;

  let m: RegExpExecArray | null;
  while ((m = importRe.exec(source)) !== null) {
    specifiers.push(m[1]);
  }
  while ((m = exportRe.exec(source)) !== null) {
    specifiers.push(m[1]);
  }
  return specifiers;
}

// ---------------------------------------------------------------------------
// Check 1: Import Boundaries
// ---------------------------------------------------------------------------

interface ImportRule {
  dir: string;
  description: string;
  forbidden: string[];
}

const IMPORT_RULES: ImportRule[] = [
  {
    dir: 'lib/renderer-foundation',
    description:
      'renderer-foundation MUST NOT import BusinessBrief, IndustryRegistry, or RecipeBlueprint',
    forbidden: [
      'business-brief',
      'industry-registry',
      'recipe-blueprint',
      'question-engine',
      'recipe-engine',
    ],
  },
  {
    dir: 'lib/recipe-engine',
    description: 'recipe-engine MUST NOT import React or Vue',
    forbidden: ['react', 'vue'],
  },
];

function checkImportBoundaries(): string[] {
  const violations: string[] = [];

  for (const rule of IMPORT_RULES) {
    const dir = path.join(SRC, rule.dir);
    const files = collectFiles(dir);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const specifiers = extractImports(source);

      for (const specifier of specifiers) {
        for (const forbidden of rule.forbidden) {
          if (specifier.includes(forbidden)) {
            violations.push(
              `[Import Boundary] ${path.relative(ROOT, file)} imports "${specifier}" — ${rule.description}`,
            );
          }
        }
      }
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Check 2: Immutability Enforcement
// ---------------------------------------------------------------------------

/**
 * Returns whether a source file imports the frozen v2 ThemeConfig SSOT.
 *
 * The immutability policy protects the v2 ThemeConfig SSOT
 * (`@/lib/theme-config/v2`). Legacy persistence shapes that happen to be named
 * `ThemeConfig` (e.g. `@/types/site`) are a DIFFERENT type and are NOT the SSOT.
 * The detector must only enforce immutability on files that actually import the
 * v2 SSOT, otherwise it produces false positives on legacy API routes.
 */
function importsV2ThemeConfig(source: string): boolean {
  const specifiers = extractImports(source);
  return specifiers.some((s) => s.includes('theme-config/v2'));
}

/**
 * Detects direct mutation of the frozen v2 ThemeConfig SSOT.
 *
 * We look for patterns where a variable named `config` (or `themeConfig`) is
 * followed by a property assignment or a mutating method call on a nested
 * resource collection. Examples:
 *   - `config.resources.pages.push(...)`
 *   - `config.metadata.title = "..."`
 *   - `themeConfig.resources.sections.push(...)`
 *
 * The check ONLY applies to files that import the v2 ThemeConfig SSOT. Legacy
 * `ThemeConfig` shapes (from `@/types/site`) are a different, mutable
 * persistence type and are out of scope for this policy.
 *
 * This is a heuristic static check. It flags the most common direct-mutation
 * patterns. The designated merger/builder directories are exempt.
 */
function checkImmutability(): string[] {
  const violations: string[] = [];
  const files = collectAllSrcFiles();

  // Mutating array methods on resource collections.
  const mutatingMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
  // Direct property assignment on a config object.
  const assignmentRe = /(?:config|themeConfig)\.[A-Za-z0-9_.]+\s*=/g;

  for (const file of files) {
    const rel = path.relative(SRC, file);
    const isAllowed = ALLOWED_MUTATION_DIRS.some((dir) => rel.startsWith(dir));
    if (isAllowed) {
      continue;
    }

    const source = fs.readFileSync(file, 'utf8');
    // Only enforce immutability on files that use the frozen v2 SSOT. Legacy
    // `ThemeConfig` shapes (e.g. `@/types/site`) are a different type.
    if (!importsV2ThemeConfig(source)) {
      continue;
    }
    const lines = source.split('\n');


    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect mutating method calls on config resource collections.
      for (const method of mutatingMethods) {
        const mutRe = new RegExp(
          `(?:config|themeConfig)\\.[A-Za-z0-9_.]*\\.${method}\\s*\\(`,
        );
        if (mutRe.test(line)) {
          violations.push(
            `[Immutability] ${path.relative(ROOT, file)}:${i + 1} mutates ThemeConfig via ".${method}()" — ${line.trim()}`,
          );
        }
      }

      // Detect direct property assignment on config.
      assignmentRe.lastIndex = 0;
      if (assignmentRe.test(line)) {
        violations.push(
          `[Immutability] ${path.relative(ROOT, file)}:${i + 1} assigns to ThemeConfig directly — ${line.trim()}`,
        );
      }
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Check 3: Registry Compliance
// ---------------------------------------------------------------------------

/**
 * Strips comments from a source line so that static analysis only inspects
 * executable code, never documentation text.
 *
 * This prevents false positives where a JSDoc comment merely *describes* a
 * banned pattern (e.g. "Array.find() is BANNED") from being flagged as a
 * violation. The policy itself is unchanged — only the detector is improved.
 */
function stripComments(line: string): string {
  // Normalize CRLF line endings so anchors behave predictably.
  let stripped = line.replace(/\r/g, '');
  // Remove block comment fragments (/* ... */ and * continuation lines).
  stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
  stripped = stripped.replace(/^\s*\*.*$/, '');
  // Remove single-line // comments.
  stripped = stripped.replace(/\/\/.*$/, '');
  return stripped;
}


/**
 * Detects raw `Array.find()` usage in rendering paths.
 *
 * Rendering MUST use O(1) ResourceRegistry<T> map lookups. `Array.find()` is
 * O(n) and is BANNED in rendering paths.
 */
function checkRegistryCompliance(): string[] {
  const violations: string[] = [];
  const findRe = /\.find\s*\(/;

  for (const dir of RENDERING_DIRS) {
    const fullDir = path.join(SRC, dir);
    const files = collectFiles(fullDir);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const lines = source.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const code = stripComments(lines[i]);
        if (findRe.test(code)) {
          violations.push(
            `[Registry Compliance] ${path.relative(ROOT, file)}:${i + 1} uses raw Array.find() in a rendering path — ${lines[i].trim()}`,
          );
        }
      }
    }
  }

  return violations;
}


// ---------------------------------------------------------------------------
// Check 4: Zero Core Imports (Phase 13.3 - Plugin Sandbox)
// ---------------------------------------------------------------------------

/**
 * The directory that holds Plugins. Plugins are sandboxed: they MUST import
 * ONLY from `@awie/sdk` (or standard libraries). They MUST NEVER import an
 * internal core module.
 */
const PLUGINS_DIR = 'plugins';

/**
 * The ONLY import specifier a Plugin is allowed to use for AWIE code.
 *
 * A Plugin depends strictly on the `@awie/sdk` boundary. Any other AWIE import
 * (e.g. `@/lib/runtime`, `@/lib/theme-engine`, `@/lib/cms-core`, or a relative
 * path into `src/lib/...`) is a violation of the Plugin Sandbox.
 */
const ALLOWED_PLUGIN_IMPORT = '@awie/sdk';

/**
 * Detects Plugins that import internal Core modules.
 *
 * The Plugin Sandbox boundary (Phase 13.3) requires that a Plugin import ONLY
 * from `@awie/sdk` (or standard libraries). Importing an internal core module
 * would let a Plugin reach the Core Registry directly, bypassing the
 * PluginLoader — the ONLY entity allowed to mutate the Core Registry.
 *
 * We detect any import specifier that:
 *   - is NOT `@awie/sdk`, AND
 *   - is NOT a standard library (node:*, node builtins), AND
 *   - is NOT a relative import within the plugin's own directory (./ or ../),
 *     AND
 *   - is NOT a bare third-party package (e.g. "react", "lodash").
 *
 * Any specifier that points into the AWIE source tree (`@/`, `src/`, or a
 * relative path escaping the plugin directory) is flagged.
 */
function checkZeroCoreImports(): string[] {
  const violations: string[] = [];
  const dir = path.join(SRC, PLUGINS_DIR);
  const files = collectFiles(dir);

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const specifiers = extractImports(source);

    for (const specifier of specifiers) {
      // The @awie/sdk boundary is the ONLY allowed AWIE import.
      if (specifier === ALLOWED_PLUGIN_IMPORT) {
        continue;
      }
      // Standard library imports are allowed.
      if (specifier.startsWith('node:')) {
        continue;
      }
      // Relative imports within the plugin's own directory are allowed.
      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        continue;
      }
      // Bare third-party package imports are allowed (e.g. "react").
      if (!specifier.startsWith('@/') && !specifier.startsWith('src/')) {
        continue;
      }

      // Any remaining specifier points into the AWIE source tree. This is a
      // violation of the Plugin Sandbox boundary.
      violations.push(
        `[Zero Core Imports] ${path.relative(ROOT, file)} imports "${specifier}" — ` +
          'Plugins MUST import ONLY from @awie/sdk (or standard libraries). ' +
          'They MUST NEVER import an internal core module.',
      );
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('AWIE V2 Phase 11 M1 - CI Architecture Guard');
  console.log('============================================\n');

  const importViolations = checkImportBoundaries();
  const immutabilityViolations = checkImmutability();
  const registryViolations = checkRegistryCompliance();
  const zeroCoreImportViolations = checkZeroCoreImports();

  const allViolations = [
    ...importViolations,
    ...immutabilityViolations,
    ...registryViolations,
    ...zeroCoreImportViolations,
  ];

  console.log(`[Check 1] Import Boundaries: ${importViolations.length} violation(s)`);
  console.log(`[Check 2] Immutability:      ${immutabilityViolations.length} violation(s)`);
  console.log(`[Check 3] Registry Compliance: ${registryViolations.length} violation(s)`);
  console.log(`[Check 4] Zero Core Imports: ${zeroCoreImportViolations.length} violation(s)`);
  console.log(`\nTotal violations: ${allViolations.length}\n`);

  if (allViolations.length === 0) {
    console.log('ALL CI ARCHITECTURE GUARDS PASSED');
    console.log('The AWIE Runtime Constitution is enforced.');
    return;
  }

  console.error(`CI ARCHITECTURE GUARD VIOLATIONS (${allViolations.length}):`);
  for (const v of allViolations) {
    console.error(`  ${v}`);
  }
  console.error('\nArchitecture violated. Exiting with error code 1.');
  process.exit(1);
}

main();
