/**
 * AWIE V2 Brain — ContentPlan contract (Step 09).
 *
 * ContentPlan translates an ALREADY-DECIDED DecisionPlan into explicit content
 * requirements for AI #2. It is a deterministic content contract, NOT a decision
 * engine.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *
 *   BusinessMeaning
 *     ↓
 *   DecisionEngine
 *     ↓
 *   DecisionPlan             WHAT
 *     ↓
 *   HOW Contract
 *     ↓
 *   Recipe Integration       HOW compatibility
 *     ↓
 *   ContentPlan              CONTENT requirements   ← THIS STEP
 *     ↓
 *   AI #2                    EXPRESSION only
 *     ↓
 *   Fact Validator
 *     ↓
 *   ThemeConfig
 *     ↓
 *   Renderer
 *
 * ContentPlan does NOT:
 *   - create capabilities,
 *   - remove capabilities,
 *   - change capability states,
 *   - select UI components / layouts / themes,
 *   - create facts,
 *   - generate copy,
 *   - call an LLM.
 *
 * It is a pure, deterministic, side-effect-free translation of an existing
 * decision into a content requirement contract that AI #2 will consume.
 *
 * FACT BOUNDARY:
 *   AI #2 is NOT allowed to invent business facts. Facts may originate only from
 *   approved provenance (user_asserted, cms, imported, system_verified). The
 *   ContentPlan distinguishes:
 *     A. verified/available concrete facts,
 *     B. unavailable concrete facts,
 *     C. generic content that may safely be written without facts.
 *   It NEVER converts missing → verified, and NEVER upgrades
 *   user_asserted → system_verified.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain business logic. It is pure
 * data modeling + runtime validation + a deterministic translation. It MUST NOT
 * reference React, HTML, CSS, ThemeConfig, Renderer, or industry names. It MUST
 * NOT become a hidden Decision Engine (no "if trust then create testimonial").
 */

import { z } from 'zod';
import type { CapabilityId } from './capability';
import type { DecisionPlan } from './decision-plan';
import type { Evidence, ProvenanceValue } from './evidence';

/**
 * The Content Requirement Type vocabulary.
 *
 * This is the smallest strongly-typed vocabulary needed to express content
 * requirements. It is SEMANTIC — it is NOT a UI section name and NOT an
 * industry-specific content type (no BakeryCopy, MusicianBio, etc.).
 */
export const ContentRequirementType = {
  /** Concrete factual content. Only expressible when facts are available. */
  Factual: 'factual',
  /** Generic descriptive content that may be written safely without facts. */
  Generic: 'generic',
  /** Content that may reference available evidence (e.g. testimonials). */
  EvidenceBacked: 'evidence_backed',
  /** Optional content — may be omitted. */
  Optional: 'optional',
  /** Explicitly unavailable content — must NOT be invented. */
  Unavailable: 'unavailable',
} as const;

/** The union of all valid ContentRequirementType values. */
export type ContentRequirementTypeValue =
  (typeof ContentRequirementType)[keyof typeof ContentRequirementType];

/** Zod schema for a ContentRequirementType value. */
export const contentRequirementTypeSchema = z.enum(
  Object.values(ContentRequirementType) as [
    ContentRequirementTypeValue,
    ...ContentRequirementTypeValue[],
  ]
);

/**
 * The Fact Availability vocabulary.
 *
 * Describes whether concrete facts are available for a content requirement.
 * This is derived deterministically from the supplied evidence. It is the
 * anti-hallucination substrate: AI #2 may only express concrete facts when
 * availability is `available`.
 */
export const FactAvailability = {
  /** Concrete facts exist in the supplied evidence and may be expressed. */
  Available: 'available',
  /** Concrete facts are NOT available and MUST NOT be invented. */
  Unavailable: 'unavailable',
  /** Generic descriptive content may be written without concrete facts. */
  GenericSafe: 'generic_safe',
} as const;

/** The union of all valid FactAvailability values. */
export type FactAvailabilityValue =
  (typeof FactAvailability)[keyof typeof FactAvailability];

/** Zod schema for a FactAvailability value. */
export const factAvailabilitySchema = z.enum(
  Object.values(FactAvailability) as [
    FactAvailabilityValue,
    ...FactAvailabilityValue[],
  ]
);

/**
 * A single content-plan requirement.
 *
 * This is the unit AI #2 consumes. It tells AI #2:
 *   1. What semantic content is required.
 *   2. Which facts are available (and their provenance).
 *   3. Which facts are unavailable.
 *   4. Which facts may be referenced.
 *   5. Which content must remain generic.
 *   6. What must never be invented.
 *
 * NOTE: This is distinct from the DecisionPlan's `ContentRequirement` (a
 * semantic content requirement recorded by the Decision Engine). This type is
 * the ContentPlan's requirement contract for AI #2.
 */
export interface ContentPlanRequirement {
  /** A stable identifier for this requirement. */
  id: string;
  /** The semantic capability this requirement serves. */
  capability: CapabilityId;
  /** The semantic kind of content required. */
  type: ContentRequirementTypeValue;
  /** A semantic description of the required content. */
  description: string;
  /** Whether this content is required or optional. */
  required: boolean;
  /** Whether concrete facts are available for this requirement. */
  factAvailability: FactAvailabilityValue;
  /** Whether generic descriptive content may be written without facts. */
  genericAllowed: boolean;
  /** The provenance of the backing evidence, preserved exactly (never upgraded). */
  provenance?: ProvenanceValue;
  /** The evidence ids that back this requirement (empty when none available). */
  evidenceRefs: string[];
  /** Explicit list of what must NEVER be invented for this requirement. */
  mustNotInvent: string[];
}

/** Zod schema for a ContentPlanRequirement. */
export const contentPlanRequirementSchema = z.object({
  id: z.string().min(1),
  capability: z.enum(
    Object.values({
      discovery: 'discovery',
      purchase: 'purchase',
      booking: 'booking',
      inquiry: 'inquiry',
      lead_capture: 'lead_capture',
      location: 'location',
      trust: 'trust',
    }) as [CapabilityId, ...CapabilityId[]]
  ),
  type: contentRequirementTypeSchema,
  description: z.string().min(1),
  required: z.boolean(),
  factAvailability: factAvailabilitySchema,
  genericAllowed: z.boolean(),
  provenance: z
    .enum(['user_asserted', 'cms', 'imported', 'system_verified'])
    .optional(),
  evidenceRefs: z.array(z.string()),
  mustNotInvent: z.array(z.string()),
});

/**
 * Dormant content metadata.
 *
 * DORMANT capabilities produce NO active generation requirement. Only this
 * minimal metadata is preserved for future CMS activation.
 *
 * `requirementId` is the explicit, stable identifier a generated content item
 * would use to target this capability. It is carried as explicit contract data
 * so downstream consumers (e.g. the Fact Validator) can map a generated item
 * back to a dormant capability WITHOUT parsing a naming convention.
 */
export interface DormantContent {
  /** The dormant semantic capability. */
  capability: CapabilityId;
  /** The explicit requirement id that would target this dormant capability. */
  requirementId: string;
  /** Why it is dormant / what would activate it. */
  note: string;
}

/** Zod schema for DormantContent. */
export const dormantContentSchema = z.object({
  capability: z.enum([
    'discovery',
    'purchase',
    'booking',
    'inquiry',
    'lead_capture',
    'location',
    'trust',
  ]),
  requirementId: z.string().min(1),
  note: z.string().min(1),
});

/**
 * Dropped content metadata.
 *
 * DROP capabilities have NO content requirement. This minimal metadata records
 * the dropped capability together with its explicit requirement id so
 * downstream consumers can map a generated item back to a dropped capability
 * WITHOUT parsing a naming convention.
 */
export interface DroppedContent {
  /** The dropped semantic capability. */
  capability: CapabilityId;
  /** The explicit requirement id that would target this dropped capability. */
  requirementId: string;
}

/** Zod schema for DroppedContent. */
export const droppedContentSchema = z.object({
  capability: z.enum([
    'discovery',
    'purchase',
    'booking',
    'inquiry',
    'lead_capture',
    'location',
    'trust',
  ]),
  requirementId: z.string().min(1),
});


/**
 * ContentPlan — the deterministic content contract for AI #2.
 *
 * It is derived from an already-decided DecisionPlan. It carries NO UI, layout,
 * component, or ThemeConfig information.
 */
export interface ContentPlan {
  /** A stable identifier for this content plan instance. */
  id: string;
  /** The DecisionPlan id this content plan derives from. */
  planId: string;
  /** The content requirements for ACTIVE / GENERIC capabilities. */
  requirements: ContentPlanRequirement[];
  /** Dormant metadata only (no active generation requirements). */
  dormant: DormantContent[];
  /** Capabilities with no content requirement (DROP). */
  dropped: DroppedContent[];
}

/** Zod schema for ContentPlan. */
export const contentPlanSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  requirements: z.array(contentPlanRequirementSchema),
  dormant: z.array(dormantContentSchema),
  dropped: z.array(droppedContentSchema),
});


/**
 * A declarative content requirement template for a capability.
 *
 * This is a CONTENT REQUIREMENT vocabulary, not a decision. The Decision Engine
 * already decided the capabilities; this template only says "this capability
 * needs this kind of content." It is deliberately industry-independent.
 */
interface ContentRequirementTemplate {
  /** The semantic kind of content required. */
  type: ContentRequirementTypeValue;
  /** A semantic description of the required content. */
  description: string;
  /** Whether this content is required. */
  required: boolean;
  /** The evidence subject that would make this requirement factual. */
  evidenceSubject?: string;
  /** What must never be invented for this requirement. */
  mustNotInvent: string[];
}

/**
 * The declarative capability → content requirement mapping.
 *
 * This is the ONLY place that maps a capability to a content requirement. It is
 * a pure vocabulary lookup. It NEVER invents facts and NEVER becomes a decision
 * engine (it does not branch on evidence to create different capabilities).
 */
export const CAPABILITY_CONTENT_REQUIREMENTS: Record<
  CapabilityId,
  ContentRequirementTemplate
> = {
  discovery: {
    type: ContentRequirementType.Factual,
    description:
      'Content describing the business offerings (products/services) so users can discover what is available.',
    required: true,
    evidenceSubject: 'offering',
    mustNotInvent: [
      'specific product names',
      'specific prices',
      'specific availability claims',
    ],
  },
  purchase: {
    type: ContentRequirementType.Factual,
    description:
      'Content describing what can be purchased and how, enabling a purchase decision.',
    required: true,
    evidenceSubject: 'offering',
    mustNotInvent: [
      'specific prices',
      'specific product/service names',
      'specific transaction details',
    ],
  },
  booking: {
    type: ContentRequirementType.Factual,
    description:
      'Content describing how to book an appointment, slot, or resource.',
    required: true,
    evidenceSubject: 'schedule',
    mustNotInvent: ['specific dates', 'specific venues', 'specific times'],
  },
  inquiry: {
    type: ContentRequirementType.Generic,
    description:
      'Content describing how users can contact or submit an inquiry.',
    required: true,
    mustNotInvent: [
      'specific phone numbers',
      'specific email addresses',
      'specific contact details',
    ],
  },
  lead_capture: {
    type: ContentRequirementType.Generic,
    description:
      'Content describing the lead capture offer and how to engage.',
    required: true,
    mustNotInvent: ['specific offers', 'specific incentives'],
  },
  location: {
    type: ContentRequirementType.Factual,
    description:
      'Content describing the physical location and how to find it.',
    required: true,
    evidenceSubject: 'address',
    mustNotInvent: ['specific street address', 'specific coordinates'],
  },
  trust: {
    type: ContentRequirementType.EvidenceBacked,
    description:
      'Content that builds trust through methodology, credentials, or evidence.',
    required: true,
    evidenceSubject: 'testimonial',
    mustNotInvent: [
      'customer names',
      'customer quotations',
      'client logos',
      'case results',
    ],
  },
};

/**
 * Builds a ContentPlan from an already-decided DecisionPlan.
 *
 * This is a pure, deterministic, side-effect-free translation. It NEVER:
 *   - creates / removes / changes capabilities or states,
 *   - invents facts,
 *   - upgrades provenance,
 *   - calls an LLM.
 *
 * State handling:
 *   ACTIVE   → required content contract (fact availability from evidence).
 *   GENERIC  → generic-safe content contract (concrete facts never treated as
 *              available; this explicitly prevents fact invention).
 *   DORMANT  → no active generation requirement; dormant metadata only.
 *   DROP     → no content requirement.
 *
 * The same DecisionPlan always produces the same ContentPlan.
 */
export function buildContentPlan(plan: DecisionPlan): ContentPlan {
  const requirements: ContentPlanRequirement[] = [];
  const dormant: DormantContent[] = [];
  const dropped: DroppedContent[] = [];

  for (const planned of plan.capabilities) {
    const template = CAPABILITY_CONTENT_REQUIREMENTS[planned.capability];

    switch (planned.state) {
      case 'ACTIVE':
        requirements.push(
          buildRequirement(planned.capability, template, plan, 'ACTIVE')
        );
        break;
      case 'GENERIC':
        requirements.push(
          buildRequirement(planned.capability, template, plan, 'GENERIC')
        );
        break;
      case 'DORMANT':
        dormant.push({
          capability: planned.capability,
          requirementId: `content-${planned.capability}`,
          note: 'Dormant; may be activated later via CMS/data entry.',
        });
        break;
      case 'DROP':
        dropped.push({
          capability: planned.capability,
          requirementId: `content-${planned.capability}`,
        });
        break;
    }
  }


  return {
    id: `content-${plan.id}`,
    planId: plan.id,
    requirements,
    dormant,
    dropped,
  };
}

/**
 * Builds a single ContentRequirement for an ACTIVE / GENERIC capability.
 *
 * The fact availability is resolved deterministically from the supplied
 * evidence. Provenance is preserved exactly — never upgraded.
 */
function buildRequirement(
  capability: CapabilityId,
  template: ContentRequirementTemplate,
  plan: DecisionPlan,
  state: 'ACTIVE' | 'GENERIC'
): ContentPlanRequirement {
  // GENERIC state means concrete data is insufficient. Even if matching
  // evidence exists, a GENERIC capability MUST NOT reference it: doing so would
  // let AI #2 treat concrete facts as available and risk fact invention. Only
  // ACTIVE capabilities may attach evidence refs / provenance.
  const evidence =
    state === 'ACTIVE' ? findEvidence(plan, template.evidenceSubject) : undefined;
  const availability = resolveAvailability(state, evidence);

  return {
    id: `content-${capability}`,
    capability,
    type: template.type,
    description: template.description,
    required: template.required,
    factAvailability: availability,
    genericAllowed: template.type !== ContentRequirementType.Unavailable,
    provenance: evidence?.provenance,
    evidenceRefs: evidence ? [evidence.id] : [],
    mustNotInvent: [...template.mustNotInvent],
  };
}


/**
 * Resolves the FactAvailability for a requirement.
 *
 *   - GENERIC state → always `generic_safe`. GENERIC means concrete data is
 *     insufficient, so concrete facts are NEVER treated as available. This
 *     explicitly prevents fact invention.
 *   - ACTIVE state → `available` when matching evidence exists, else
 *     `unavailable` (concrete facts absent; generic content still permitted via
 *     `genericAllowed`).
 */
function resolveAvailability(
  state: 'ACTIVE' | 'GENERIC',
  evidence: Evidence | undefined
): FactAvailabilityValue {
  if (state === 'GENERIC') return FactAvailability.GenericSafe;
  if (evidence) return FactAvailability.Available;
  return FactAvailability.Unavailable;
}

/**
 * Finds the first evidence item whose subject matches the requirement's
 * evidence subject.
 *
 * This is a pure, deterministic lookup. It NEVER invents evidence and NEVER
 * upgrades provenance. Returns undefined when no matching evidence exists.
 */
function findEvidence(
  plan: DecisionPlan,
  subject: string | undefined
): Evidence | undefined {
  if (!subject) return undefined;
  for (const set of plan.evidence) {
    if (subjectMatches(set.subject, subject)) {
      const item = set.items[0];
      if (item) return item;
    }
  }
  return undefined;
}

/**
 * Determines whether an evidence subject matches a required subject.
 *
 * Supports exact match or a tokenized match (e.g. "offering, products" matches
 * "offering"). Deterministic and conservative.
 */
function subjectMatches(actual: string, expected: string): boolean {
  if (actual === expected) return true;
  return actual.split(/[\s,]+/).includes(expected);
}
   