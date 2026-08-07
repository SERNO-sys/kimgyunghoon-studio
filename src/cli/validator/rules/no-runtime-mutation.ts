/**
 * AWIE V2 - Phase 16.5: CLI Toolkit - NoRuntimeMutationRule.
 *
 * ============================================================================
 * ADR-010 (Developer Experience & SDK Strategy) — RULE REGISTRY PATTERN
 * ============================================================================
 * This rule is registered as a PLUGIN to the checker. It asserts that a plugin
 * does NOT mutate the Runtime or the immutable ThemeConfig.
 *
 * ============================================================================
 * ADR-008 (Runtime Purity) — THE ABSOLUTE LAW
 * ============================================================================
 * "Runtime receives only execution contracts. Runtime never resolves, edits,
 * composes, validates, or decides."
 *
 * A plugin MUST NOT mutate the RuntimeState or the immutable ThemeConfig. It
 * may only consume the @awie/sdk boundary. This rule flags any assignment or
 * mutation targeting a Runtime/ThemeConfig symbol.
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
  IValidationRule,
  ValidationAst,
  ValidationVerdict,
} from './types';

/**
 * The set of Runtime/ThemeConfig symbol names that a plugin MUST NOT mutate.
 *
 * These are the frozen Core boundaries. A plugin may ONLY consume the
 * @awie/sdk boundary.
 */
const FORBIDDEN_MUTATION_SYMBOLS: readonly string[] = [
  'themeConfig',
  'runtimeState',
  'stateStore',
  'adapterRegistry',
  'actionRegistry',
  'permissionResolver',
  'hydrationEngine',
];

/**
 * A regex that matches assignment/mutation statements targeting a forbidden
 * symbol.
 *
 * It captures:
 *   - `themeConfig.foo = ...`
 *   - `runtimeState.foo = ...`
 *   - `stateStore.setState(...)`
 *   - `adapterRegistry.register(...)`
 */
const MUTATION_RE =
  /\b(themeConfig|runtimeState|stateStore|adapterRegistry|actionRegistry|permissionResolver|hydrationEngine)\s*(?:\.\w+\s*)?(?:=|\.setState\(|\.register\(|\.patchSlice\()/g;

/**
 * The NoRuntimeMutationRule.
 *
 * Asserts that a plugin does NOT mutate the Runtime or the immutable
 * ThemeConfig (ADR-008 Runtime Purity).
 */
export const noRuntimeMutationRule: IValidationRule = {
  id: 'no-runtime-mutation',
  description:
    'Asserts that a plugin does NOT mutate the Runtime or the immutable ThemeConfig (ADR-008 Runtime Purity).',
  evaluate(ast: ValidationAst): ValidationVerdict {
    const violations: { file: string; symbol: string }[] = [];

    for (const [filePath, source] of Object.entries(ast.files)) {
      let match: RegExpExecArray | null;
      MUTATION_RE.lastIndex = 0;
      while ((match = MUTATION_RE.exec(source)) !== null) {
        violations.push({ file: filePath, symbol: match[1] });
      }
    }

    if (violations.length > 0) {
      const first = violations[0];
      return {
        ruleId: this.id,
        severity: 'error',
        message: `Forbidden Runtime/ThemeConfig mutation of "${first.symbol}". A plugin MUST NOT mutate the Runtime or the immutable ThemeConfig (ADR-008 Runtime Purity).`,
        file: first.file,
      };
    }

    return {
      ruleId: this.id,
      severity: 'pass',
      message: 'No Runtime/ThemeConfig mutations detected.',
    };
  },
};
