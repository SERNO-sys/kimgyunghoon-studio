/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Commands barrel.
 *
 * Exports all built-in CLI commands.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. Each command
 *   is pure infrastructure; none contain business logic.
 */

import type { CliCommand } from '../core';
import { createCommand } from './create';
import { newCommand } from './new';
import { validateCommand } from './validate';
import { checkCommand } from './check';
import { buildCommand } from './build';
import { installCommand } from './install';
import { doctorCommand } from './doctor';

/**
 * The built-in command set.
 */
export const commands: readonly CliCommand[] = [
  createCommand,
  newCommand,
  validateCommand,
  checkCommand,
  buildCommand,
  installCommand,
  doctorCommand,
];

export { createCommand } from './create';
export { newCommand } from './new';
export { validateCommand } from './validate';
export { checkCommand } from './check';
export { buildCommand } from './build';
export { installCommand } from './install';
export { doctorCommand } from './doctor';


