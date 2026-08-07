/**
 * AWIE V2 - Phase 16.5: CLI Toolkit - Validation Rule Registry Types.
 *
 * ============================================================================
 * ADR-010 (Developer Experience & SDK Strategy) — RULE REGISTRY PATTERN
 * ============================================================================
 * The Architecture Review Board has FROZEN the Validator UX as a RULE REGISTRY
 * PATTERN. The CLI runner is COMPLETELY DECOUPLED from the rules.
 *
 *   interface IValidationRule {
 *     id: string;
 *     evaluate(ast: AST): ValidationVerdict;
 *   }
 *
 * Rules like NoRuntimeMutationRule and ZeroCoreImportsRule are registered as
 * PLUGINS to the checker. This makes the validator extensible: new rules can be
 * added without modifying the runner.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. The
 *   validator performs OFFLINE static analysis only. It never loads or executes
 *   a plugin against the Core.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

/**
 * The severity of a validation verdict.
 */
export type ValidationVerdictSeverity = 'error' | 'warning' | 'pass';

/**
 * The result of evaluating a single validation rule against an AST.
 *
 * A pure declaration of the rule's outcome. It contains no logic.
 */
export interface ValidationVerdict {
  /**
   * The id of the rule that produced this verdict.
   */
  readonly ruleId: string;

  /**
   * The severity of the verdict.
   *
   *   - 'error'   - the rule failed (blocks the check).
   *   - 'warning' - the rule produced a warning (non-blocking unless strict).
   *   - 'pass'    - the rule passed.
   */
  readonly severity: ValidationVerdictSeverity;

  /**
   * A human-readable message describing the verdict.
   */
  readonly message: string;

  /**
   * The file the verdict relates to (if any).
   */
  readonly file?: string;
}

/**
 * A minimal, framework-agnostic AST node.
 *
 * The validator performs OFFLINE static analysis. It does NOT depend on a
 * specific parser (e.g., Babel, TypeScript AST). This is a structural contract
 * that rules consume. Rules may traverse the AST via the `children` array.
 */
export interface AstNode {
  /**
   * The node type (e.g., 'ImportDeclaration', 'CallExpression').
   */
  readonly type: string;

  /**
   * The source file path this node belongs to (if any).
   */
  readonly file?: string;

  /**
   * The raw source text of the node (if available).
   */
  readonly source?: string;

  /**
   * Arbitrary node metadata (e.g., import specifier, callee name).
   */
  readonly data?: Readonly<Record<string, unknown>>;

  /**
   * The child nodes.
   */
  readonly children?: readonly AstNode[];
}

/**
 * The AST input to a validation rule.
 *
 * A pure declaration of the parsed plugin source. It contains no logic.
 */
export interface ValidationAst {
  /**
   * The root AST node.
   */
  readonly root: AstNode;

  /**
   * The source files that were parsed (file path -> source text).
   */
  readonly files: Readonly<Record<string, string>>;
}

/**
 * A single validation rule.
 *
 * ============================================================================
 * ADR-010 (API Naming Freeze) — RULE REGISTRY PATTERN
 * ============================================================================
 * A rule is a pure function that evaluates an AST and returns a verdict. Rules
 * are registered as PLUGINS to the checker. The runner is completely decoupled
 * from the rules.
 *
 * This is a permanent public contract.
 */
export interface IValidationRule {
  /**
   * The stable id of the rule (e.g., 'zero-core-imports').
   */
  readonly id: string;

  /**
   * A short description of the rule.
   */
  readonly description: string;

  /**
   * Evaluates the rule against the given AST.
   *
   * @param ast The parsed plugin AST.
   * @returns The validation verdict for this rule.
   */
  evaluate(ast: ValidationAst): ValidationVerdict;
}
