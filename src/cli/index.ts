/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Entry point.
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
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import { CommandRegistry, parseArgs, createConsoleOutput } from './core';
import type { Output } from './core';
import { commands } from './commands';

/**
 * The CLI version.
 */
export const CLI_VERSION = '0.1.0';

/**
 * Builds a fully-wired command registry with all built-in commands.
 *
 * @returns A CommandRegistry with all built-in commands registered.
 */
export function buildRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  for (const command of commands) {
    registry.register(command);
  }
  return registry;
}

/**
 * Prints the help text.
 *
 * @param output The output sink.
 */
function printHelp(output: Output): void {
  const registry = buildRegistry();
  output.header('AWIE CLI');
  output.info(`Version ${CLI_VERSION}`);
  output.info('');
  output.info('Usage: awie <command> [args]');
  output.info('');
  output.info('Commands:');
  for (const command of registry.list()) {
    output.info(`  ${command.name.padEnd(12)} ${command.description}`);
  }
  output.info('');
  output.info('Run "awie <command> --help" for command-specific usage.');
}

/**
 * Runs the CLI with the given raw argument tokens.
 *
 * @param tokens The raw argument tokens (excluding the node/script path).
 * @param output The output sink (defaults to the console).
 * @returns The exit code.
 */
export function runCli(
  tokens: readonly string[],
  output: Output = createConsoleOutput(),
): number {
  const registry = buildRegistry();

  if (tokens.length === 0 || tokens[0] === '--help' || tokens[0] === '-h') {
    printHelp(output);
    return 0;
  }

  const commandName = tokens[0];
  const args = parseArgs(tokens.slice(1));

  // Support "awie <command> --help".
  if (args.flags['help'] === true) {
    const command = registry.get(commandName);
    if (command) {
      output.header(command.name);
      output.info(command.description);
      output.info('');
      output.info(`Usage: ${command.usage}`);
      return 0;
    }
  }

  const result = registry.dispatch(commandName, args);

  if (result.message) {
    if (result.ok) {
      output.success(result.message);
    } else {
      output.error(result.message);
    }
  }

  return result.exitCode;
}
