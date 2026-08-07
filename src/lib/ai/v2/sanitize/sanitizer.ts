/**
 * AWIE V2 - Sanitizer implementation.
 *
 * The Sanitizer normalizes raw provider output before validation. It:
 *   - Removes markdown code fences (e.g. ```json ... ```)
 *   - Strips surrounding prose and extracts the JSON payload
 *   - Attempts safe repairs for common LLM JSON errors (trailing commas,
 *     unquoted keys, single quotes, missing brackets)
 *   - Rejects payloads that cannot be safely repaired
 *
 * It is provider-independent and business-logic-free.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

import type { SanitizeResult, Sanitizer } from './types';

/** A single repair operation applied to the raw text. */
interface Repair {
  /** Human-readable description of the repair. */
  label: string;
  /** Applies the repair and returns the repaired text, or null if not applicable. */
  apply: (text: string) => string | null;
}

/**
 * A generic, provider-agnostic Sanitizer.
 */
export class SanitizerImpl implements Sanitizer {
  /**
   * Sanitizes raw provider output. Returns a SanitizeResult indicating whether
   * the output is usable and what repairs were applied.
   */
  sanitize(raw: string): SanitizeResult {
    const warnings: string[] = [];
    let text = raw.trim();

    // 1. Strip markdown code fences.
    const fenced = this.stripFences(text);
    if (fenced !== text) {
      warnings.push('Removed markdown code fences.');
      text = fenced;
    }

    // 2. Extract the JSON payload from surrounding prose.
    const extracted = this.extractJson(text);
    if (extracted !== text) {
      warnings.push('Extracted JSON payload from surrounding text.');
      text = extracted;
    }

    // 3. Attempt safe repairs.
    const repaired = this.repair(text, warnings);
    text = repaired;

    // 4. Verify the result is actually parseable JSON.
    if (!this.isValidJson(text)) {
      return {
        text,
        ok: false,
        warnings,
        raw,
      };
    }

    return {
      text,
      ok: true,
      warnings,
      raw,
    };
  }

  /**
   * Attempts to parse sanitized text as JSON. Returns the parsed value, or null
   * when the text is not valid JSON even after sanitization.
   */
  parseJson<T = unknown>(raw: string): T | null {
    const result = this.sanitize(raw);
    if (!result.ok) {
      return null;
    }
    try {
      return JSON.parse(result.text) as T;
    } catch {
      return null;
    }
  }

  /**
   * Removes markdown code fences (```json ... ```, ``` ... ```, ~~~ ... ~~~).
   */
  private stripFences(text: string): string {
    // Match an opening fence (optionally with a language tag) and a closing fence.
    const fencePattern = /^\s*```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)\n?\s*```\s*$/;
    const match = text.match(fencePattern);
    if (match) {
      return match[1].trim();
    }

    // Tilde fences.
    const tildePattern = /^\s*~~~[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)\n?\s*~~~\s*$/;
    const tildeMatch = text.match(tildePattern);
    if (tildeMatch) {
      return tildeMatch[1].trim();
    }

    return text;
  }

  /**
   * Extracts the first balanced JSON object or array from surrounding prose.
   * Returns the original text when no JSON payload is found.
   */
  private extractJson(text: string): string {
    const start = text.search(/[\[{]/);
    if (start === -1) {
      return text;
    }

    const open = text[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === open) {
        depth++;
      } else if (ch === close) {
        depth--;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }

    return text;
  }

  /**
   * Applies a sequence of safe repairs. Each repair is only applied if it
   * produces valid JSON; otherwise it is skipped.
   */
  private repair(text: string, warnings: string[]): string {
    const repairs: Repair[] = [
      {
        label: 'Removed trailing commas.',
        apply: (t) => t.replace(/,\s*([}\]])/g, '$1'),
      },
      {
        label: 'Quoted unquoted object keys.',
        apply: (t) =>
          t.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":'),
      },
      {
        label: 'Replaced single quotes with double quotes.',
        apply: (t) => this.replaceSingleQuotes(t),
      },
      {
        label: 'Wrapped bare values in quotes.',
        apply: (t) => this.wrapBareValues(t),
      },
      {
        label: 'Added missing closing bracket.',
        apply: (t) => this.addMissingBracket(t),
      },
    ];

    let current = text;
    for (const repair of repairs) {
      const candidate = repair.apply(current);
      if (candidate !== null && candidate !== current && this.isValidJson(candidate)) {
        warnings.push(repair.label);
        current = candidate;
      }
    }

    return current;
  }

  /**
   * Replaces single-quoted strings with double-quoted strings, being careful
   * not to touch apostrophes inside double-quoted strings.
   */
  private replaceSingleQuotes(text: string): string | null {
    let out = '';
    let inDouble = false;
    let inSingle = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inDouble) {
        out += ch;
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inDouble = false;
        }
        continue;
      }
      if (inSingle) {
        if (escaped) {
          out += ch;
          escaped = false;
        } else if (ch === '\\') {
          out += ch;
          escaped = true;
        } else if (ch === "'") {
          out += '"';
          inSingle = false;
        } else {
          out += ch;
        }
        continue;
      }
      if (ch === '"') {
        inDouble = true;
        out += ch;
      } else if (ch === "'") {
        inSingle = true;
        out += '"';
      } else {
        out += ch;
      }
    }

    return out;
  }

  /**
   * Wraps bare (unquoted) string values in double quotes. This is a best-effort
   * repair and only applied when the result is valid JSON.
   */
  private wrapBareValues(text: string): string | null {
    // Match `: value` where value is a bare word (not true/false/null/number).
    return text.replace(
      /:\s*([A-Za-z_][A-Za-z0-9_\s-]*?)([,}\]])/g,
      (_m, value: string, end: string) => {
        const trimmed = value.trim();
        if (
          trimmed === 'true' ||
          trimmed === 'false' ||
          trimmed === 'null' ||
          /^-?\d+(\.\d+)?$/.test(trimmed)
        ) {
          return `: ${trimmed}${end}`;
        }
        return `: "${trimmed}"${end}`;
      }
    );
  }

  /**
   * Adds a missing closing bracket when the text is an unbalanced object/array.
   */
  private addMissingBracket(text: string): string | null {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (const ch of text) {
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === '{' || ch === '[') {
        depth++;
      } else if (ch === '}' || ch === ']') {
        depth--;
      }
    }

    if (depth <= 0) {
      return null;
    }

    let out = text;
    while (depth > 0) {
      out += '}';
      depth--;
    }
    return out;
  }

  /**
   * Returns whether the given text parses as valid JSON.
   */
  private isValidJson(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }
}
