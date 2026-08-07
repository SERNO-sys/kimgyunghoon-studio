/**
 * AWIE V2 - Phase 16.5: CLI Toolkit - Validation Rule Registry.
 *
 * ============================================================================
 * ADR-010 (Developer Experience & SDK Strategy) — RULE REGISTRY PATTERN
 * ============================================================================
 * The CLI runner is COMPLETELY DECOUPLED from the rules. Rules are registered
 * as PLUGINS to the checker via this registry. New rules can be added without
 * modifying the runner.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. The
 *   validator performs OFFLINE static analysis only.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { IValidationRule, ValidationAst, ValidationVerdict } from './types';

/**
 * The result of running all registered rules against an AST.
 *
 * A pure declaration of the aggregate check outcome. It contains no logic.
 */
export interface RuleCheckResult {
  /**
   * Whether all rules passed (no errors; warnings are non-blocking unless
   * strict mode is enabled).
   */
  readonly ok: boolean;

  /**
   * The verdicts from all registered rules.
   */
  readonly verdicts: readonly ValidationVerdict[];

  /**
   * The number of error verdicts.
   */
  readonly errorCount: number;

  /**
   * The number of warning verdicts.
   */
  readonly warningCount: number;
}

/**
 * A registry of validation rules.
 *
 * Rules are registered by id. The checker runs all registered rules against an
 * AST and aggregates their verdicts. The runner is completely decoupled from
 * the rules.
 */
export class RuleRegistry {
  private readonly rules = new Map<string, IValidationRule>();

  /**
   * Registers a validation rule.
   *
   * @param rule The rule to register.
   */
  register(rule: IValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Returns whether a rule with the given id is registered.
   *
   * @param id The rule id.
   */
  has(id: string): boolean {
    return this.rules.has(id);
  }

  /**
   * Returns the registered rule with the given id, or undefined.
   *
   * @param id The rule id.
   */
  get(id: string): IValidationRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Returns all registered rules, sorted by id.
   */
  list(): IValidationRule[] {
    return [...this.rules.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Runs all registered rules against the given AST and aggregates the
   * verdicts.
   *
   * @param ast The parsed plugin AST.
   * @param strict Whether warnings should be treated as errors.
   * @returns The aggregate check result.
   */
  check(ast: ValidationAst, strict: boolean): RuleCheckResult {
    const verdicts = this.list().map((rule) => rule.evaluate(ast));

    const errorCount = verdicts.filter((v) => v.severity === 'error').length;
    const warningCount = verdicts.filter((v) => v.severity === 'warning').length;

    // In strict mode, warnings are treated as errors.
    const effectiveErrors = strict ? errorCount + warningCount : errorCount;

    return {
      ok: effectiveErrors === 0,
      verdicts,
      errorCount,
      warningCount,
    };
  }
}
