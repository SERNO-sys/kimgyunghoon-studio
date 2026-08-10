/**
 * AWIE V2 Brain — Decision State Resolver v1.
 *
 * Step 04. The Decision State Resolver converts semantic Capability candidates
 * (produced by the Decision Rule Engine) into their resolved CapabilityState.
 *
 * The four states are:
 *
 *   ACTIVE   — sufficient basis to be represented specifically.
 *   GENERIC  — business meaning is clear but specific underlying data is
 *              unavailable; represent without inventing specific facts.
 *   DORMANT  — relevant but cannot currently be activated; remains available as
 *              a future CMS/data activation opportunity.
 *   DROP     — excluded by explicit deterministic scope/budget/conflict rules.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - Evidence is a GATE, not a capability. Evidence does NOT create
 *     capabilities; it determines how specifically an already-selected
 *     capability can be expressed.
 *   - Evidence evaluation is SCOPED to the capability's data requirement. One
 *     global boolean must never activate every capability.
 *   - Missing evidence is NOT automatic DROP. It is resolved according to the
 *     capability's semantic fallback policy (GENERIC or DORMANT).
 *   - Provenance is preserved. `user_asserted` / `cms` / `imported` are never
 *     silently upgraded to `system_verified`.
 *
 * STRICT CONSTRAINT: This module is PURE and DETERMINISTIC. No LLM, no
 * randomness, no current-time dependency, no database, no UI inspection.
 */

import {
  CapabilityState,
  type CapabilityStateValue,
  type CapabilityId,
} from './capability';
import type { EvidenceSet } from './evidence';

/**
 * The semantic data requirement keys.
 *
 * Each key names the kind of specific data that would allow a capability to be
 * expressed concretely (ACTIVE). These are SEMANTIC data subjects — they are
 * NOT UI concepts and NOT capabilities.
 */
export const DataRequirementKey = {
  /** Specific offering / product records. */
  offering: 'offering',
  /** Specific product records. */
  product: 'product',
  /** Specific schedule / performance records. */
  schedule: 'schedule',
  /** Specific contact details. */
  contact: 'contact',
  /** Specific lead capture configuration. */
  lead: 'lead',
  /** Specific address / location details. */
  address: 'address',
  /** Verified testimonial / client evidence. */
  testimonial: 'testimonial',
} as const;

/** The union of all valid DataRequirementKey values. */
export type DataRequirementKeyValue =
  (typeof DataRequirementKey)[keyof typeof DataRequirementKey];

/**
 * The semantic fallback policy for a capability.
 *
 * This policy determines how a capability behaves when its specific data is
 * absent. It is the deterministic authority for the GENERIC vs DORMANT
 * distinction:
 *
 *   GENERIC — the business function should be represented now, but specific
 *             data is unavailable (e.g. a bakery sells products but no product
 *             catalog was supplied).
 *   DORMANT — the business function is relevant, but activation should wait for
 *             future data or explicit CMS action (e.g. a musician has
 *             performances but no performance dates).
 *
 * The policy also carries the semantic content requirements for both the
 * ACTIVE and fallback cases. These are semantic requirements — never UI
 * concepts.
 */
export interface CapabilityDataPolicy {
  /** The semantic capability this policy applies to. */
  capability: CapabilityId;
  /** The EvidenceSet.subject that provides specific data for this capability. */
  dataSubject: DataRequirementKeyValue;
  /**
   * The fallback state when specific data is absent. Must be GENERIC or
   * DORMANT — never DROP (missing evidence is not an automatic drop).
   */
  missingDataState: CapabilityStateValue;
  /** Semantic content requirement when specific data is present (ACTIVE). */
  activeContentRequirement: string;
  /** Semantic content requirement when specific data is absent (fallback). */
  fallbackContentRequirement: string;
}

/**
 * The canonical Capability data policies v1.
 *
 * Each canonical capability maps to the specific data that would make it
 * ACTIVE, and to its semantic fallback policy when that data is absent.
 *
 * NOTE ON SCOPED EVIDENCE: each policy names a distinct `dataSubject`. Evidence
 * for one subject (e.g. `address`) never satisfies another subject (e.g.
 * `testimonial`). This prevents cross-domain evidence leakage.
 */
export const CAPABILITY_DATA_POLICIES: readonly CapabilityDataPolicy[] = [
  {
    capability: 'discovery',
    dataSubject: DataRequirementKey.offering,
    missingDataState: CapabilityState.GENERIC,
    activeContentRequirement: 'specific offering records are required',
    fallbackContentRequirement: 'generic offering description is acceptable',
  },
  {
    capability: 'purchase',
    dataSubject: DataRequirementKey.product,
    missingDataState: CapabilityState.GENERIC,
    activeContentRequirement: 'specific product records are required',
    fallbackContentRequirement: 'generic product description is acceptable',
  },
  {
    capability: 'booking',
    dataSubject: DataRequirementKey.schedule,
    missingDataState: CapabilityState.DORMANT,
    activeContentRequirement: 'specific schedule records are required',
    fallbackContentRequirement:
      'future schedule data may activate this capability',
  },
  {
    capability: 'inquiry',
    dataSubject: DataRequirementKey.contact,
    missingDataState: CapabilityState.GENERIC,
    activeContentRequirement: 'specific contact details are required',
    fallbackContentRequirement: 'generic contact channel is acceptable',
  },
  {
    capability: 'lead_capture',
    dataSubject: DataRequirementKey.lead,
    missingDataState: CapabilityState.GENERIC,
    activeContentRequirement:
      'specific lead capture configuration is required',
    fallbackContentRequirement: 'generic lead capture mechanism is acceptable',
  },
  {
    capability: 'location',
    dataSubject: DataRequirementKey.address,
    missingDataState: CapabilityState.GENERIC,
    activeContentRequirement: 'specific address and location details are required',
    fallbackContentRequirement: 'generic location reference is acceptable',
  },
  {
    capability: 'trust',
    dataSubject: DataRequirementKey.testimonial,
    missingDataState: CapabilityState.GENERIC,
    activeContentRequirement: 'verified testimonial evidence is required',
    fallbackContentRequirement:
      'trust must be represented without fabricated evidence',
  },
];

/**
 * Resolve the CapabilityState for a single capability given scoped evidence.
 *
 * The state is determined by whether specific data for the capability's
 * `dataSubject` is present in the evidence set. Evidence is SCOPED by
 * `EvidenceSet.subject` — evidence for one subject never satisfies another.
 *
 * This is a pure, deterministic function. It never invents facts and never
 * upgrades provenance.
 */
export function resolveCapabilityState(
  capability: CapabilityId,
  evidence: readonly EvidenceSet[],
  policy: CapabilityDataPolicy
): CapabilityStateValue {
  const hasSpecificData = evidence.some(
    (set) => set.subject === policy.dataSubject && set.items.length > 0
  );
  return hasSpecificData ? CapabilityState.ACTIVE : policy.missingDataState;
}
