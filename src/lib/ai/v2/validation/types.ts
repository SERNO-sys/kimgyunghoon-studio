/**
 * AWIE V2 - Validator Interface.
 *
 * The Validator accepts only schema-valid output. It performs schema
 * validation and cross-field validation, and rejects invalid output so a bad
 * AI response can never corrupt downstream state (e.g. ThemeConfig).
 *
 * STRICT CONSTRAINT: This interface MUST NOT contain any business logic. It
 * defines the contract only. Concrete validators (implemented in a later step)
 * may encode schema rules but never business decisions.
 */

/**
 * The result of a validation operation.
 */
export interface ValidationResult<T = unknown> {
  /** Whether the output passed validation. */
  ok: boolean;
  /** The validated, typed output when validation succeeded. */
  data?: T;
  /** A list of human-readable validation errors when validation failed. */
  errors: string[];
  /** A list of non-fatal warnings. */
  warnings: string[];
}

/**
 * The Validator accepts only schema-valid output.
 */
export interface Validator<T = unknown> {
  /**
   * Validates a parsed value. Returns a ValidationResult with the typed data
   * on success or a list of errors on failure.
   */
  validate(value: unknown): ValidationResult<T>;
}
