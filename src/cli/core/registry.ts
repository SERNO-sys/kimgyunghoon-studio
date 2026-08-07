/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Command registry.
 *
 * A tiny, dependency-free command registry. It maps command names to their
 * handlers and dispatches parsed args to the correct command.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. This
 *   registry is pure infrastructure; it contains NO business logic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { CliCommand, CommandResult } from './types';

/**
 * A registry of CLI commands.
 *
 * Commands are registered by name. The registry dispatches parsed args to the
 * matching command handler.
 */
export class CommandRegistry {
  private readonly commands = new Map<string, CliCommand>();

  /**
   * Registers a command.
   *
   * @param command The command to register.
   */
  register(command: CliCommand): void {
    this.commands.set(command.name, command);
  }

  /**
   * Returns whether a command with the given name is registered.
   *
   * @param name The command name.
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Returns the registered command with the given name, or undefined.
   *
   * @param name The command name.
   */
  get(name: string): CliCommand | undefined {
    return this.commands.get(name);
  }

  /**
   * Returns all registered commands, sorted by name.
   */
  list(): CliCommand[] {
    return [...this.commands.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /**
   * Dispatches a command name and parsed args to the matching handler.
   *
   * @param name The command name.
   * @param args The parsed args.
   * @returns The command result, or a "not found" result.
   */
  dispatch(name: string, args: Parameters<CliCommand['run']>[0]): CommandResult {
    const command = this.commands.get(name);
    if (!command) {
      return {
        ok: false,
        exitCode: 1,
        message: `Unknown command: "${name}". Run "awie --help" for usage.`,
      };
    }
    return command.run(args);
  }
}
