/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Core framework barrel.
 *
 * Exports the tiny, dependency-free CLI framework primitives.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. This module
 *   is pure infrastructure; it contains NO business logic.
 */

export type { CliArgs, CliCommand, CommandResult } from './types';
export { parseArgs } from './parser';
export { CommandRegistry } from './registry';
export type { Output } from './output';
export { createConsoleOutput } from './output';
