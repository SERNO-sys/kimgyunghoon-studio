/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Core framework types.
 *
 * The `awie` CLI is a Developer Experience (DX) tool. It is the FINAL phase of
 * the AWIE V2 Engine. It allows external developers to scaffold, validate, and
 * package plugins in under 5 minutes.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. It consumes
 *   the `@awie/sdk` boundary (for manifest/semver/lifecycle contracts) and
 *   performs OFFLINE validation. It never mutates the Core Registry directly.
 *
 *   The CLI is dependency-free (no `commander`, no `yargs`). It uses a tiny
 *   internal command framework so the tool remains portable and auditable.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

/**
 * A parsed CLI argument.
 *
 * Supports:
 *   - positional arguments (e.g. `awie create plugin my-plugin`)
 *   - flags (e.g. `--core-version 2.0.0`)
 *   - boolean flags (e.g. `--strict`)
 */
export interface CliArgs {
  /** The positional arguments (excluding the command path). */
  readonly positionals: readonly string[];
  /** The parsed flags (key -> value). Boolean flags have value `true`. */
  readonly flags: Readonly<Record<string, string | boolean>>;
}

/**
 * The result of a CLI command execution.
 *
 * A pure declaration of the command outcome. It contains no logic.
 */
export interface CommandResult {
  /** Whether the command succeeded. */
  readonly ok: boolean;
  /** The exit code (0 for success, non-zero for failure). */
  readonly exitCode: number;
  /** An optional human-readable message. */
  readonly message?: string;
}

/**
 * A CLI command definition.
 *
 * A command is a pure function that receives parsed args and returns a result.
 * It contains no framework coupling.
 */
export interface CliCommand {
  /** The command name (e.g. "create"). */
  readonly name: string;
  /** A short description shown in help. */
  readonly description: string;
  /** The usage string (e.g. "awie create plugin <name>"). */
  readonly usage: string;
  /** The command handler. */
  readonly run: (args: CliArgs) => CommandResult;
}
