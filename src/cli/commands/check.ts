/**
 * AWIE V2 - Phase 16.5: CLI Toolkit - `check` command.
 *
 * ============================================================================
 * ADR-010 (Developer Experience & SDK Strategy) — RULE REGISTRY PATTERN
 * ============================================================================
 * The `check` command runs the Rule Registry Pattern. The CLI runner is
 * COMPLETELY DECOUPLED from the rules. Rules like NoRuntimeMutationRule and
 * ZeroCoreImportsRule are registered as PLUGINS to the checker via the
 * RuleRegistry. New rules can be added without modifying the runner.
 *
 * The command is a pure function: it receives a set of source files and returns
 * a RuleCheckResult. It contains NO filesystem coupling. The CLI runner reads
 * the files from disk and passes them in.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. The checker
 *   performs OFFLINE static analysis only. It never loads or executes a plugin.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { CliCommand, CommandResult } from '../core';
import {
  createDefaultRuleRegistry,
  type ValidationAst,
} from '../validator/rules';

/**
 * Builds a ValidationAst from a set of source files.
 *
 * The validator is framework-agnostic: it consumes a structural AST contract.
 * Each source file is wrapped in a SourceFile node.
 *
 * @param files A map of file path -> source text.
 */
function buildAst(files: Readonly<Record<string, string>>): ValidationAst {
  const root = {
    type: 'Program',
    children: Object.entries(files).map(([file, source]) => ({
      type: 'SourceFile',
      file,
      source,
      children: [],
    })),
  };

  return { root, files };
}

/**
 * The `check` command.
 *
 * Runs the Rule Registry Pattern against a set of source files. The runner is
 * completely decoupled from the rules.
 */
export const checkCommand: CliCommand = {
  name: 'check',
  description:
    'Run the Rule Registry Pattern against plugin source files (offline static analysis).',
  usage: 'awie check <file...> [--strict]',
  run: (args): CommandResult => {
    const files = args.positionals;
    if (files.length === 0) {
      return {
        ok: false,
        exitCode: 1,
        message: 'Usage: awie check <file...> [--strict]',
      };
    }

    // The command receives source text via the flags (the runner reads files
    // from disk and passes them in as a JSON-encoded map). This keeps the
    // command free of filesystem coupling.
    const rawSources = args.flags['sources'];
    if (typeof rawSources !== 'string') {
      return {
        ok: false,
        exitCode: 1,
        message:
          'The check command requires source text. Pass --sources \'{"path":"text"}\'.',
      };
    }

    let sources: Record<string, string>;
    try {
      sources = JSON.parse(rawSources) as Record<string, string>;
    } catch {
      return {
        ok: false,
        exitCode: 1,
        message: 'Invalid --sources JSON. Expected a map of file path -> source text.',
      };
    }

    const strict = args.flags['strict'] === true;
    const registry = createDefaultRuleRegistry();
    const result = registry.check(buildAst(sources), strict);

    const verdictLines = result.verdicts.map((v) => {
      const tag = v.severity === 'pass' ? 'PASS' : v.severity.toUpperCase();
      const file = v.file ? ` (${v.file})` : '';
      return `  [${tag}] ${v.ruleId}: ${v.message}${file}`;
    });

    return {
      ok: result.ok,
      exitCode: result.ok ? 0 : 1,
      message: JSON.stringify({
        ok: result.ok,
        errorCount: result.errorCount,
        warningCount: result.warningCount,
        verdicts: verdictLines,
      }),
    };
  },
};
