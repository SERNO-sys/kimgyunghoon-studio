/**
 * AWIE V2 - Phase 10: ThemeCertifier Barrel (Mandate 3).
 *
 * Exports the ThemeCertifier types and implementation.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

export type {
  CertificationCategory,
  CertificationCheck,
  CertificationResult,
  RequiredAccessibilityToken,
  RequiredComponentId,
  ThemeCertifier,
} from './types';

export {
  REQUIRED_ACCESSIBILITY_TOKENS,
  REQUIRED_COMPONENTS,
} from './types';

export { DefaultThemeCertifier } from './certifier';
