/**
 * AWIE V2 - Phase 11 M2: Feature Flags - barrel export.
 *
 * A context-driven FeatureFlagService. The service itself MUST NOT know about
 * Tenant or Environment. The application layer passes a FeatureFlagContext; the
 * runtime service only evaluates the rules against that context.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

// Contract types.
export type {
  FeatureFlag,
  FeatureFlagContext,
  FeatureFlagRule,
  FeatureFlagService,
} from './types';

// FeatureFlagService.
export { DefaultFeatureFlagService } from './feature-flag-service';
