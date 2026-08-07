/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Plugin Validator barrel.
 *
 * Exports the offline plugin validator.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. The
 *   validator performs OFFLINE static analysis only.
 */

export type {
  ValidationFinding,
  ValidationOptions,
  ValidationResult,
  ValidationSeverity,
} from './types';
export type { ValidationInput } from './validator';
export { validatePlugin } from './validator';
export { validateManifest } from './manifest';
export { scanForCoreImports, scanFileForCoreImports } from './zero-core-imports';
