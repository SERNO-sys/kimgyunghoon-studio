/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Manifest validator.
 *
 * The `awie validate` command MUST assert that a plugin's manifest is valid.
 * This checker validates the manifest shape against the SDK's PluginManifest
 * contract.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. This checker
 *   performs OFFLINE static analysis only. It never loads or executes a plugin.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { ValidationFinding } from './types';

/**
 * The set of valid extension kinds.
 */
const VALID_KINDS: readonly string[] = ['renderer', 'theme', 'component'];

/**
 * Validates a raw manifest object.
 *
 * @param manifest The raw manifest (parsed from JSON).
 * @returns The findings for the manifest.
 */
export function validateManifest(manifest: unknown): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  if (manifest === null || typeof manifest !== 'object') {
    findings.push({
      severity: 'error',
      check: 'manifest',
      message: 'Manifest must be an object.',
    });
    return findings;
  }

  const m = manifest as Record<string, unknown>;

  // id
  if (typeof m.id !== 'string' || m.id.trim() === '') {
    findings.push({
      severity: 'error',
      check: 'manifest',
      message: 'Manifest "id" must be a non-empty string.',
    });
  }

  // name
  if (typeof m.name !== 'string' || m.name.trim() === '') {
    findings.push({
      severity: 'error',
      check: 'manifest',
      message: 'Manifest "name" must be a non-empty string.',
    });
  }

  // version
  if (typeof m.version !== 'string' || m.version.trim() === '') {
    findings.push({
      severity: 'error',
      check: 'manifest',
      message: 'Manifest "version" must be a non-empty string.',
    });
  }

  // core.version
  const core = m.core as Record<string, unknown> | undefined;
  if (core === undefined || typeof core !== 'object') {
    findings.push({
      severity: 'error',
      check: 'manifest',
      message: 'Manifest "core" must be an object with a "version".',
    });
  } else if (typeof core.version !== 'string' || core.version.trim() === '') {
    findings.push({
      severity: 'error',
      check: 'manifest',
      message: 'Manifest "core.version" must be a non-empty string.',
    });
  }

  // capabilities
  const capabilities = m.capabilities as Record<string, unknown> | undefined;
  if (capabilities === undefined || typeof capabilities !== 'object') {
    findings.push({
      severity: 'error',
      check: 'manifest',
      message: 'Manifest "capabilities" must be an object.',
    });
  } else {
    for (const kind of VALID_KINDS) {
      const value = capabilities[kind];
      if (value !== undefined && !Array.isArray(value)) {
        findings.push({
          severity: 'error',
          check: 'manifest',
          message: `Manifest "capabilities.${kind}" must be an array.`,
        });
      }
    }
  }

  return findings;
}
