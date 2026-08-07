/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Zero Core Imports checker.
 *
 * The `awie validate` command MUST assert that a plugin has ZERO direct imports
 * of internal AWIE Core modules. A plugin may import ONLY from `@awie/sdk` (or
 * standard libraries / third-party packages).
 *
 * This checker scans the plugin's source files for import/require statements
 * and flags any that resolve to an internal Core module.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. This checker
 *   performs OFFLINE static analysis only. It never loads or executes a plugin.
 *
 *   The checker is intentionally conservative: it flags any import whose
 *   specifier matches a known Core module path prefix. This prevents a plugin
 *   from reaching the Core Registry, ThemeEngine, Renderer, or any other Core
 *   service directly.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { ValidationFinding } from './types';

/**
 * The set of internal Core module path prefixes that a plugin MUST NOT import.
 *
 * These are the frozen Core boundaries. A plugin may ONLY depend on `@awie/sdk`.
 */
const FORBIDDEN_CORE_PREFIXES: readonly string[] = [
  'src/lib/runtime',
  'src/lib/theme-engine',
  'src/lib/cms-core',
  'src/lib/renderer',
  'src/lib/renderer-foundation',
  'src/lib/renderer-react',
  'src/lib/theme-config',
  'src/lib/theme-ecosystem',
  'src/lib/question-engine',
  'src/lib/industry-registry',
  'src/lib/recipe-engine',
  'src/lib/routing',
  'src/lib/runtime-services',
  'src/lib/ai',
  'src/lib/golden-path',
  'src/lib/editor-integration',
  'src/lib/compatibility-matrix',
  'src/lib/sdk/loader',
];

/**
 * The ONLY allowed AWIE import specifier.
 */
const ALLOWED_AWIE_SPECIFIER = '@awie/sdk';

/**
 * A regex that matches import/require specifiers in TypeScript source.
 *
 * It captures:
 *   - `import ... from '<specifier>'`
 *   - `import '<specifier>'`
 *   - `require('<specifier>')`
 *   - `export ... from '<specifier>'`
 */
const IMPORT_SPECIFIER_RE =
  /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * Returns whether an import specifier targets an internal Core module.
 *
 * @param specifier The import specifier (e.g. "@awie/sdk", "../src/lib/runtime").
 */
function isForbiddenCoreImport(specifier: string): boolean {
  // The SDK boundary is the ONLY allowed AWIE import.
  if (specifier === ALLOWED_AWIE_SPECIFIER) {
    return false;
  }
  // Any relative import that reaches into a Core module path is forbidden.
  if (specifier.startsWith('.')) {
    return FORBIDDEN_CORE_PREFIXES.some((prefix) =>
      specifier.includes(prefix),
    );
  }
  // Any absolute import that is NOT the SDK and NOT a standard/third-party
  // package is treated as a potential Core import. We only flag known Core
  // prefixes here to avoid false positives on third-party packages.
  return FORBIDDEN_CORE_PREFIXES.some((prefix) =>
    specifier.includes(prefix),
  );
}

/**
 * Scans a single source file for forbidden Core imports.
 *
 * @param filePath The file path (for reporting).
 * @param source The file source text.
 * @returns The findings for this file.
 */
export function scanFileForCoreImports(
  filePath: string,
  source: string,
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  IMPORT_SPECIFIER_RE.lastIndex = 0;
  while ((match = IMPORT_SPECIFIER_RE.exec(source)) !== null) {
    const specifier = match[1] ?? match[2];
    if (specifier === undefined) continue;
    if (seen.has(specifier)) continue;
    seen.add(specifier);

    if (isForbiddenCoreImport(specifier)) {
      findings.push({
        severity: 'error',
        check: 'zero-core-imports',
        message: `Forbidden direct Core import: "${specifier}". A plugin may import ONLY from "@awie/sdk".`,
        file: filePath,
      });
    }
  }

  return findings;
}

/**
 * Scans multiple source files for forbidden Core imports.
 *
 * @param files A map of file path -> source text.
 * @returns The findings across all files.
 */
export function scanForCoreImports(
  files: Readonly<Record<string, string>>,
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const [filePath, source] of Object.entries(files)) {
    findings.push(...scanFileForCoreImports(filePath, source));
  }
  return findings;
}
