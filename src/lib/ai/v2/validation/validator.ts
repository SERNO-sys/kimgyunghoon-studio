/**
 * AWIE V2 - Validator implementation.
 *
 * The Validator accepts only schema-valid output. It performs strict schema
 * validation (via Zod) and optional cross-field validation, and rejects invalid
 * output so a bad AI response can never corrupt downstream state (e.g.
 * ThemeConfig).
 *
 * The schema is passed in generically by higher-level engines; this module
 * never hardcodes ThemeConfig, BusinessBrief, or Recipe structures.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

import { z } from 'zod';
import type { ValidationResult, Validator } from './types';

/**
 * A cross-field validation rule. Higher-level engines may supply these to
 * enforce relationships between fields that a flat schema cannot express.
 */
export interface CrossFieldRule<T> {
  /** Human-readable description of the rule. */
  description: string;
  /** Returns an error message when the rule is violated, or null when it passes. */
  check: (data: T) => string | null;
}

/**
 * Options for constructing a Validator.
 */
export interface ValidatorOptions<T> {
  /** Optional cross-field validation rules applied after schema validation. */
  crossFieldRules?: CrossFieldRule<T>[];
}

/**
 * A generic, provider-agnostic Validator backed by a Zod schema.
 *
 * @template T The validated output type.
 */
export class ZodValidator<T> implements Validator<T> {
  private readonly schema: z.ZodType<T>;
  private readonly crossFieldRules: CrossFieldRule<T>[];

  constructor(schema: z.ZodType<T>, options: ValidatorOptions<T> = {}) {
    this.schema = schema;
    this.crossFieldRules = options.crossFieldRules ?? [];
  }

  /**
   * Validates a parsed value. Returns a ValidationResult with the typed data on
   * success or a list of detailed errors on failure.
   */
  validate(value: unknown): ValidationResult<T> {
    const warnings: string[] = [];

    // 1. Strict schema validation.
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      return {
        ok: false,
        errors: this.formatZodErrors(parsed.error),
        warnings,
      };
    }

    const data = parsed.data;

    // 2. Cross-field validation.
    const crossFieldErrors: string[] = [];
    for (const rule of this.crossFieldRules) {
      const error = rule.check(data);
      if (error) {
        crossFieldErrors.push(`${rule.description}: ${error}`);
      }
    }

    if (crossFieldErrors.length > 0) {
      return {
        ok: false,
        errors: crossFieldErrors,
        warnings,
      };
    }

    return {
      ok: true,
      data,
      errors: [],
      warnings,
    };
  }

  /**
   * Formats Zod errors into a flat, human-readable list suitable for the Retry
   * Engine and for surfacing to the model in a repair prompt.
   */
  private formatZodErrors(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      return `${path}: ${issue.message}`;
    });
  }
}
