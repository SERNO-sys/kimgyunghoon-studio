/**
 * AWIE V2 - Phase 16.5: CLI Toolkit - ZeroCoreImportsRule.
 *
 * ============================================================================
 * ADR-010 (Developer Experience & SDK Strategy) — RULE REGISTRY PATTERN
 * ============================================================================
 * This rule is registered as a PLUGIN to the checker. It asserts that a plugin
 * has ZERO direct imports of internal AWIE Core modules. A plugin may import
 * ONLY from `@awie/sdk` (or standard libraries / third-party packages).
 *
 * The rule is completely decoupled from the CLI runner. It consumes the
 * framework-agnostic ValidationAst and returns a ValidationVerdict.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. This rule
 *   performs OFFLINE static analysis only. It never loads or executes a plugin.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type {
  AstNode,
  IValidationRule,
  ValidationAst,
  ValidationVerdict,
} from './types';

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
  // Any import that reaches into a Core module path is forbidden.
  return FORBIDDEN_CORE_PREFIXES.some((prefix) =>
    specifier.includes(prefix),
  );
}

/**
 * Collects all import specifiers from a source file.
 *
 * @param source The file source text.
 * @returns The unique import specifiers found.
 */
function collectImportSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  IMPORT_SPECIFIER_RE.lastIndex = 0;
  while ((match = IMPORT_SPECIFIER_RE.exec(source)) !== null) {
    const specifier = match[1] ?? match[2];
    if (specifier === undefined) continue;
    if (seen.has(specifier)) continue;
    seen.add(specifier);
    specifiers.push(specifier);
  }

  return specifiers;
}

/**
 * The ZeroCoreImportsRule.
 *
 * Asserts that a plugin has ZERO direct imports of internal AWIE Core modules.
 */
export const zeroCoreImportsRule: IValidationRule = {
  id: 'zero-core-imports',
  description:
    'Asserts that a plugin imports ONLY from @awie/sdk, never from internal Core modules.',
  evaluate(ast: ValidationAst): ValidationVerdict {
    const forbidden: { file: string; specifier: string }[] = [];

    for (const [filePath, source] of Object.entries(ast.files)) {
      for (const specifier of collectImportSpecifiers(source)) {
        if (isForbiddenCoreImport(specifier)) {
          forbidden.push({ file: filePath, specifier });
        }
      }
    }

    if (forbidden.length > 0) {
      const first = forbidden[0];
      return {
        ruleId: this.id,
        severity: 'error',
        message: `Forbidden direct Core import: "${first.specifier}". A plugin may import ONLY from "@awie/sdk".`,
        file: first.file,
      };
    }

    return {
      ruleId: this.id,
      severity: 'pass',
      message: 'No forbidden Core imports detected.',
    };
  },
};

/**
 * A helper to build an AstNode for a source file.
 *
 * @param file The file path.
 * @param source The file source text.
 * @returns An AstNode representing the file.
 */
export function fileNode(file: string, source: string): AstNode {
  return {
    type: 'SourceFile',
    file,
    source,
    children: [],
  };
}
