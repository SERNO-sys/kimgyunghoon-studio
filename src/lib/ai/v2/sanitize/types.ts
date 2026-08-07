/**
 * AWIE V2 - Sanitizer Interface.
 *
 * The Sanitizer normalizes raw provider output before validation. It removes
 * markdown fences, repairs safe JSON issues, and rejects payloads that cannot
 * be salvaged. It is provider-independent and business-logic-free.
 *
 * STRICT CONSTRAINT: This interface MUST NOT contain any business logic.
 */

/**
 * The result of a sanitization operation.
 */
export interface SanitizeResult {
  /** The sanitized text. */
  text: string;
  /** Whether the sanitizer was able to produce usable output. */
  ok: boolean;
  /** A list of warnings describing what was repaired or removed. */
  warnings: string[];
  /** The original raw text, preserved for debugging. */
  raw: string;
}

/**
 * The Sanitizer normalizes raw provider output into a clean, parseable form.
 */
export interface Sanitizer {
  /**
   * Sanitizes raw provider output. Returns a SanitizeResult indicating whether
   * the output is usable and what repairs were applied.
   */
  sanitize(raw: string): SanitizeResult;

  /**
   * Attempts to parse sanitized text as JSON. Returns the parsed value, or
   * null when the text is not valid JSON even after sanitization.
   */
  parseJson<T = unknown>(raw: string): T | null;
}
