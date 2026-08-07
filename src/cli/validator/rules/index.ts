/**
 * AWIE V2 - Phase 16.5: CLI Toolkit - Validation Rule Registry barrel.
 *
 * ============================================================================
 * ADR-010 (Developer Experience & SDK Strategy) — RULE REGISTRY PATTERN
 * ============================================================================
 * The CLI runner is COMPLETELY DECOUPLED from the rules. Rules are registered
 * as PLUGINS to the checker via the RuleRegistry. New rules can be added
 * without modifying the runner.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. The
 *   validator performs OFFLINE static analysis only.
 */

export type {
  AstNode,
  IValidationRule,
  ValidationAst,
  ValidationVerdict,
  ValidationVerdictSeverity,
} from './types';
export type { RuleCheckResult } from './registry';
export { RuleRegistry } from './registry';
export { zeroCoreImportsRule } from './zero-core-imports';
export { noRuntimeMutationRule } from './no-runtime-mutation';

import { RuleRegistry } from './registry';
import { zeroCoreImportsRule } from './zero-core-imports';
import { noRuntimeMutationRule } from './no-runtime-mutation';

/**
 * Builds a RuleRegistry pre-registered with the built-in rules.
 *
 * @returns A RuleRegistry with the default rules registered.
 */
export function createDefaultRuleRegistry(): RuleRegistry {
  const registry = new RuleRegistry();
  registry.register(zeroCoreImportsRule);
  registry.register(noRuntimeMutationRule);
  return registry;
}
