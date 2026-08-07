/**
 * AWIE V2 - Industry Registry Types.
 *
 * The Industry Registry is a "Capability & Knowledge Registry", NOT a
 * presentation recommender. It describes what the business REQUIRES, not how
 * the website should look.
 *
 * STRICT BAN: No layout, skin, skeleton, typography, or heroStyle fields.
 * The Recipe Engine (Phase 07) handles themes.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling.
 */

/** A stable identifier for an industry (e.g. "restaurant"). */
export type IndustryId = string;

/** A normalized alias used to match raw user inputs. */
export type IndustryAlias = string;

/** The intent of the industry (what the business is trying to achieve). */
export interface IndustryIntent {
  /** The primary intent (e.g. "sell_food", "attract_clients"). */
  primary: string;
  /** Secondary intents. */
  secondary: string[];
}

/** Capabilities the industry supports (e.g. supportsMenu, supportsReservation). */
export interface IndustryCapabilities {
  /** Whether the industry supports a menu. */
  supportsMenu?: boolean;
  /** Whether the industry supports reservations. */
  supportsReservation?: boolean;
  /** Whether the industry supports a portfolio. */
  supportsPortfolio?: boolean;
  /** Whether the industry supports a consultation form. */
  supportsConsultationForm?: boolean;
  /** Whether the industry supports online ordering. */
  supportsOnlineOrdering?: boolean;
  /** Arbitrary additional capabilities. */
  [key: string]: boolean | undefined;
}

/** Mandatory elements the industry requires. */
export interface IndustryRequirements {
  /** Whether an address is required. */
  requiresAddress?: boolean;
  /** Whether opening hours are required. */
  requiresOpeningHours?: boolean;
  /** Whether a contact form is required. */
  requiresContactForm?: boolean;
  /** Whether a legal disclaimer is required. */
  requiresDisclaimer?: boolean;
  /** Whether a team/attorney profile is required. */
  requiresTeamProfile?: boolean;
  /** Arbitrary additional requirements. */
  [key: string]: boolean | undefined;
}

/** Specific limitations of the industry. */
export interface IndustryConstraints {
  /** Whether the industry cannot operate online-only. */
  requiresPhysicalLocation?: boolean;
  /** Whether the industry is restricted to a local service area. */
  localOnly?: boolean;
  /** Arbitrary additional constraints. */
  [key: string]: boolean | undefined;
}

/** Rules for the validator. */
export interface ValidationProfile {
  /** Fields that must be present in the brief. */
  requiredFields: string[];
  /** Fields that must NOT be present. */
  forbiddenFields: string[];
  /** Arbitrary additional validation rules. */
  [key: string]: unknown;
}

/** Hints to help the Question Engine know what to ask. */
export interface ConfidenceHints {
  /** Slots the Question Engine should prioritize asking about. */
  prioritySlots: string[];
  /** Suggested questions keyed by slot. */
  suggestedQuestions: Record<string, string[]>;
  /** Arbitrary additional hints. */
  [key: string]: unknown;
}

/** Metadata about the profile. */
export interface IndustryMetadata {
  /** The schema version of the profile. */
  version: number;
  /** The last update timestamp (ISO). */
  updatedAt: string;
  /** The source of the profile data. */
  source: string;
}

/**
 * The IndustryProfile.
 *
 * Describes what the business requires and supports. It NEVER contains
 * presentation-layer decisions.
 */
export interface IndustryProfile {
  /** The stable industry id. */
  industryId: IndustryId;
  /** Normalized aliases used for matching. */
  aliases: IndustryAlias[];
  /** The intent of the industry. */
  intent: IndustryIntent;
  /** Features the industry supports. */
  capabilities: IndustryCapabilities;
  /** Mandatory elements the industry requires. */
  requirements: IndustryRequirements;
  /** Specific limitations. */
  constraints: IndustryConstraints;
  /** Rules for the validator. */
  validationProfile: ValidationProfile;
  /** Hints for the Question Engine. */
  confidenceHints: ConfidenceHints;
  /** Profile metadata. */
  metadata: IndustryMetadata;
}
