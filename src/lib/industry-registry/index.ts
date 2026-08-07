/**
 * AWIE V2 - Industry Registry barrel export.
 *
 * The Industry Registry is a "Capability & Knowledge Registry", NOT a
 * presentation recommender. It describes what the business REQUIRES, not how
 * the website should look. The Recipe Engine (Phase 07) handles themes.
 *
 * Phase 06 is DESIGN ONLY. Implementation is intentionally postponed.
 */
export {
  type ConfidenceHints,
  type IndustryAlias,
  type IndustryCapabilities,
  type IndustryConstraints,
  type IndustryId,
  type IndustryIntent,
  type IndustryMetadata,
  type IndustryProfile,
  type IndustryRequirements,
  type ValidationProfile,
} from './types';

export {
  DuplicateIndustryError,
  IndustryRegistry,
  UnknownIndustryError,
} from './registry';

export {
  IndustryResolver,
  Normalizer,
  type ResolutionResult,
} from './resolver';

export {
  GENERIC_PROFILE,
  LAW_FIRM_PROFILE,
  MOCK_INDUSTRY_PROFILES,
  RESTAURANT_PROFILE,
} from './mocks';
