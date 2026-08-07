/**
 * AWIE V2 - Phase 09A: Architecture Guard (MANDATE 3).
 *
 * A static-analysis script that parses import statements across the codebase
 * to MATHEMATICALLY enforce our layer boundaries.
 *
 * RULES:
 *   Rule 1: Files in src/lib/renderer-foundation/ MUST NOT import anything from
 *           industry-registry, recipe-engine, or question-engine.
 *   Rule 2: Files in src/lib/recipe-engine/ MUST NOT import React, Vue, or any
 *           Renderer specifics.
 *   Rule 3: Files in src/lib/renderer-react/ MUST NOT import business logic
 *           (BusinessBrief, RecipeBlueprint).
 *
 * If ANY rule is violated, the script exits with a non-zero error code.
 *
 * Run: npx tsx scripts/architecture-guard.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/** The directories to scan (relative to src/). */
const SCAN_DIRS = [
  'lib/renderer-foundation',
  'lib/recipe-engine',
  'lib/renderer-react',
];

/** File extensions to scan. */
const EXTENSIONS = new Set(['.ts', '.tsx']);

/** Forbidden import substrings per directory (relative to src/). */
interface Rule {
  /** The directory to guard (relative to src/). */
  dir: string;
  /** A human-readable description of the rule. */
  description: string;
  /** Substrings that, if found in an import specifier, violate the rule. */
  forbidden: string[];
}

const RULES: Rule[] = [
  {
    dir: 'lib/renderer-foundation',
    description:
      'renderer-foundation MUST NOT import industry-registry, recipe-engine, or question-engine',
    forbidden: ['industry-registry', 'recipe-engine', 'question-engine'],
  },
  {
    dir: 'lib/recipe-engine',
    description:
      'recipe-engine MUST NOT import React, Vue, or any Renderer specifics',
    forbidden: ['react', 'vue', 'renderer', 'renderer-foundation', 'renderer-react'],
  },
  {
    dir: 'lib/renderer-react',
    description:
      'renderer-react MUST NOT import business logic (BusinessBrief, RecipeBlueprint)',
    forbidden: ['question-engine', 'recipe-engine', 'industry-registry', 'business-brief', 'recipe-blueprint'],
  },
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

// ---------------------------------------------------------------------------
// Import extraction
// ---------------------------------------------------------------------------

/**
 * Extracts all import specifiers from a source file.
 *
 * Handles:
 *   - `import x from '...'`
 *   - `import { a, b } from '...'`
 *   - `import * as x from '...'`
 *   - `import '...'` (side-effect)
 *   - `import type { ... } from '...'`
 *   - `export ... from '...'`
 */
function extractImports(source: string): string[] {
  const specifiers: string[] = [];
  // Match import statements (including type-only and side-effect imports).
  const importRe = /\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  // Match re-exports.
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
// Guard evaluation
// ---------------------------------------------------------------------------

interface Violation {
  file: string;
  rule: string;
  specifier: string;
}

function evaluate(): Violation[] {
  const violations: Violation[] = [];

  for (const rule of RULES) {
    const dir = path.join(SRC, rule.dir);
    const files = collectFiles(dir);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const specifiers = extractImports(source);

      for (const specifier of specifiers) {
        for (const forbidden of rule.forbidden) {
          // Match the forbidden token as a path segment (e.g. "recipe-engine"
          // should not match "recipe-engine-test").
          if (specifier.includes(forbidden)) {
            violations.push({
              file: path.relative(ROOT, file),
              rule: rule.description,
              specifier,
            });
          }
        }
      }
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('AWIE V2 Phase 09A - Architecture Guard');
  console.log('======================================\n');

  const violations = evaluate();

  let totalFiles = 0;
  for (const rule of RULES) {
    const files = collectFiles(path.join(SRC, rule.dir));
    totalFiles += files.length;
    console.log(`[Rule] ${rule.description}`);
    console.log(`       scanning ${files.length} file(s) in src/${rule.dir}`);
  }

  console.log(`\nScanned ${totalFiles} file(s) across ${RULES.length} guarded layer(s).\n`);

  if (violations.length === 0) {
    console.log('ALL ARCHITECTURE GUARDS PASSED');
    console.log('Layer boundaries are mathematically enforced.');
    return;
  }

  console.error(`ARCHITECTURE GUARD VIOLATIONS (${violations.length}):`);
  for (const v of violations) {
    console.error(`  [VIOLATION] ${v.file}`);
    console.error(`    Rule: ${v.rule}`);
    console.error(`    Import: "${v.specifier}"`);
  }
  console.error('\nLayer boundaries VIOLATED. Exiting with error code 1.');
  process.exit(1);
}

main();
