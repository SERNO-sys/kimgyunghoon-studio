/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Argument parser.
 *
 * A tiny, dependency-free argument parser. It supports:
 *
 *   - positional arguments (e.g. `awie create plugin my-plugin`)
 *   - `--flag value` and `--flag=value` forms
 *   - boolean flags (e.g. `--strict`)
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. This parser
 *   is pure infrastructure; it contains NO business logic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { CliArgs } from './types';

/**
 * Parses raw CLI tokens into structured CliArgs.
 *
 * @param tokens The raw argument tokens (excluding the node/script path).
 * @returns The parsed CliArgs.
 */
export function parseArgs(tokens: readonly string[]): CliArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // A flag token starts with "--".
    if (token.startsWith('--')) {
      const body = token.slice(2);
      const eqIndex = body.indexOf('=');
      if (eqIndex !== -1) {
        // --flag=value
        const key = body.slice(0, eqIndex);
        const value = body.slice(eqIndex + 1);
        flags[key] = value;
      } else {
        // --flag or --flag value
        const next = tokens[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          flags[body] = next;
          i++; // consume the value token
        } else {
          flags[body] = true; // boolean flag
        }
      }
    } else {
      positionals.push(token);
    }
  }

  return { positionals, flags };
}
