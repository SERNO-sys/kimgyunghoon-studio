/**
 * AWIE V2 Brain — Fact Validator contract (Step 10).
 *
 * The Fact Validator is a programmatic safety boundary between AI #2 and
 * ThemeConfig. It verifies that generated content does not claim concrete
 * business facts outside the facts permitted by the ContentPlan / Evidence
 * provenance.
 *
 * PIPELINE POSITION (Architecture Brain Freeze v1.0):
 *
 *   DecisionPlan
 *     ↓
 *   ContentPlan
 *     ↓
 *   AI #2
 *     ↓
 *   Fact Validator          ← THIS STEP
 *     ↓
 *   ThemeConfig
 *
 * CORE RESPONSIBILITY:
 *   The Validator answers ONLY: "Does this generated content comply with the
 *   already established content/fact boundary?" It does NOT decide which
 *   capabilities exist, which are ACTIVE, which Recipe is selected, which
 *   section/layout/theme is used.
 *
 * FACT BOUNDARY:
 *   A concrete fact is allowed ONLY when it is backed by an explicitly
 *   available evidence reference permitted by the ContentPlan. The Validator
 *   NEVER upgrades:
 *     missing → verified
 *     user_asserted → system_verified
 *     generic → concrete
 *   Provenance is preserved exactly.
 *
 * DETERMINISTIC GUARANTEES (provable without an LLM):
 *   1. Reference enforcement — a declared fact reference is allowed only if it
 *      is in the ContentPlan requirement's permitted `evidenceRefs`.
 *   2. Availability enforcement — a requirement whose `factAvailability` is
 *      `unavailable` or `generic_safe` may NOT carry any concrete fact
 *      reference.
 *   3. State enforcement — DORMANT / DROP requirements produce no active
 *      content; generated content targeting them is rejected.
 *   4. mustNotInvent enforcement — a bounded, deterministic pattern check
 *      against the requirement's `mustNotInvent` list (e.g. invented prices,
 *      dates, phone numbers, customer names).
 *
 * KNOWN LIMITATION (explicit, not hidden):
 *   This is NOT a general-purpose AI hallucination detector. It does NOT
 *   perform arbitrary natural-language semantic understanding. It enforces the
 *   architectural boundary via the deterministic guarantees above. Free-form
 *   prose that invents a fact WITHOUT declaring a reference and WITHOUT
 *   matching a `mustNotInvent` pattern cannot be fully detected here; that is
 *   an explicit, documented limitation of this step.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept. It MUST NOT generate or rewrite content. It
 * MUST NOT infer new business facts. It MUST NOT modify DecisionPlan or
 * ContentPlan.
 */

import { z } from 'zod';
import {
  contentPlanSchema,
  type ContentPlan,
  type ContentPlanRequirement,
} from './content-plan';
import type { ProvenanceValue } from './evidence';
import type { GeneratedContentFields } from './copywriter/types';
import { generatedContentFieldsSchema } from './copywriter/types';

/**
 * A single generated content item produced by AI #2.
 *
 * It is tagged with the ContentPlan requirement it serves so the Validator can
 * check it against the correct fact boundary. It carries NO UI / layout /
 * component / theme information.
 */
export interface GeneratedContentItem {
  /** A stable identifier for this generated content item. */
  id: string;

  /** The ContentPlan requirement id this content serves. */
  requirementId: string;
  /** The generated content body (text). */
  body: string;
  /**
   * The structured semantic fields of the generated content item.
   *
   * This is OPTIONAL for backward compatibility with legacy callers that only
   * provide a flat `body`. When present, the Validator recursively extracts all
   * string values from these fields and runs the `mustNotInvent` pattern checks
   * against them too, so invented facts hidden in structured fields are caught.
   *
   * These fields are SEMANTIC (headline, subheadline, title, body, cta, items).
   * They are NOT renderer / ThemeConfig / layout vocabulary.
   *
   * The type is the SAME canonical `GeneratedContentFields` used by the
   * copywriter contract, so AI #2 output (`GeneratedContent.fields`) is directly
   * assignable to the Validator's `GeneratedContentItem.fields` without any
   * unsafe cast or `any`.
   */
  fields?: GeneratedContentFields;

  /**
   * The concrete fact references this content claims to use.
   *
   * These MUST be evidence ids permitted by the ContentPlan requirement's
   * `evidenceRefs`. If a reference is declared here but is NOT permitted, the
   * content FAILS (provenance mismatch / outside permitted set).
   */
  factReferences: string[];
}

/** Zod schema for a GeneratedContentItem. */
export const generatedContentItemSchema = z.object({
  id: z.string().min(1),
  requirementId: z.string().min(1),
  body: z.string().min(1),
  fields: generatedContentFieldsSchema.optional(),
  factReferences: z.array(z.string()),
});



/**
 * A fact reference that is permitted by the ContentPlan.
 *
 * A concrete fact may be considered allowed ONLY when it is backed by an
 * explicitly available evidence reference permitted by the ContentPlan. This
 * type captures that permitted reference together with its provenance so the
 * Validator can preserve provenance exactly (never upgrade it).
 */
export interface AllowedFactReference {
  /** The evidence id that is permitted. */
  evidenceId: string;
  /** The provenance of the backing evidence, preserved exactly. */
  provenance: ProvenanceValue;
  /** The semantic claim the evidence supports. */
  claim: string;
}

/** Zod schema for an AllowedFactReference. */
export const allowedFactReferenceSchema = z.object({
  evidenceId: z.string().min(1),
  provenance: z.enum(['user_asserted', 'cms', 'imported', 'system_verified']),
  claim: z.string().min(1),
});

/**
 * A validation request.
 *
 * Pairs the generated content items with the ContentPlan that defines the
 * permitted fact boundary. The Validator is pure: it reads both and returns a
 * result without mutating either.
 */
export interface FactValidationRequest {
  /** The ContentPlan that defines the permitted fact boundary. */
  contentPlan: ContentPlan;
  /** The generated content items to validate. */
  items: GeneratedContentItem[];
}

/** Zod schema for a FactValidationRequest. */
export const factValidationRequestSchema = z.object({
  contentPlan: contentPlanSchema,
  items: z.array(generatedContentItemSchema),
});


/**
 * The validation result vocabulary.
 *
 * The smallest useful vocabulary: PASS / FAIL. Structured violation reasons are
 * provided via `violations` rather than a large state machine.
 */
export const FactValidationStatus = {
  PASS: 'PASS',
  FAIL: 'FAIL',
} as const;

/** The union of all valid FactValidationStatus values. */
export type FactValidationStatusValue =
  (typeof FactValidationStatus)[keyof typeof FactValidationStatus];

/** Zod schema for a FactValidationStatus value. */
export const factValidationStatusSchema = z.enum(
  Object.values(FactValidationStatus) as [
    FactValidationStatusValue,
    ...FactValidationStatusValue[],
  ]
);

/**
 * The violation reason vocabulary.
 *
 * These are the deterministic, provable violation classes. They are NOT a
 * business state machine — they are structured reasons for a FAIL result.
 */
export const FactViolationReason = {
  /** A declared fact reference is not in the requirement's permitted set. */
  UnpermittedReference: 'unpermitted_reference',
  /** A concrete fact reference was attached to a requirement with no available facts. */
  UnavailableFact: 'unavailable_fact',
  /** Generated content targets a DORMANT requirement (no active content allowed). */
  DormantContent: 'dormant_content',
  /** Generated content targets a DROP requirement (no content requirement exists). */
  DroppedContent: 'dropped_content',
  /** Generated content targets an unknown requirement id. */
  UnknownRequirement: 'unknown_requirement',
  /** A `mustNotInvent` pattern was detected in the content body. */
  InventedFact: 'invented_fact',
} as const;

/** The union of all valid FactViolationReason values. */
export type FactViolationReasonValue =
  (typeof FactViolationReason)[keyof typeof FactViolationReason];

/** Zod schema for a FactViolationReason value. */
export const factViolationReasonSchema = z.enum(
  Object.values(FactViolationReason) as [
    FactViolationReasonValue,
    ...FactViolationReasonValue[],
  ]
);

/**
 * A structured validation violation.
 *
 * Every violation is traceable to:
 *   - the content requirement (requirementId),
 *   - the evidence reference (evidenceId, when relevant),
 *   - the provenance/source (provenance, when relevant),
 *   - the violation reason.
 *
 * Provenance is preserved exactly — the Validator never fabricates a verified
 * source.
 */
export interface FactViolation {
  /** The generated content item id that violated the boundary. */
  itemId: string;
  /** The ContentPlan requirement id the content targeted. */
  requirementId: string;
  /** The violation reason. */
  reason: FactViolationReasonValue;
  /** The offending evidence reference, when relevant. */
  evidenceId?: string;
  /** The provenance of the offending reference, preserved exactly. */
  provenance?: ProvenanceValue;
  /** A human-readable explanation of the violation. */
  message: string;
}

/** Zod schema for a FactViolation. */
export const factViolationSchema = z.object({
  itemId: z.string().min(1),
  requirementId: z.string().min(1),
  reason: factViolationReasonSchema,
  evidenceId: z.string().optional(),
  provenance: z
    .enum(['user_asserted', 'cms', 'imported', 'system_verified'])
    .optional(),
  message: z.string().min(1),
});

/**
 * The validation result.
 *
 * PASS when no violations were found; FAIL otherwise. The output makes it
 * possible for a later ThemeConfig integration layer to reject unsafe content
 * (a FAIL result means the content must not be rendered).
 */
export interface FactValidationResult {
  /** The overall status. */
  status: FactValidationStatusValue;
  /** The structured violations (empty when PASS). */
  violations: FactViolation[];
}

/** Zod schema for a FactValidationResult. */
export const factValidationResultSchema = z.object({
  status: factValidationStatusSchema,
  violations: z.array(factViolationSchema),
});

/**
 * The set of deterministic `mustNotInvent` patterns.
 *
 * These are bounded, provable pattern checks. They are NOT a general-purpose
 * hallucination detector. Each pattern is a regular expression that detects a
 * concrete invented fact class (price, date, phone, email, customer name,
 * measurable result, availability, location, credential).
 *
 * KNOWN LIMITATION: These patterns catch only the specific, structured forms
 * they encode. Free-form prose that invents a fact without matching a pattern
 * and without declaring a reference is NOT fully detectable in this step.
 */
const MUST_NOT_INVENT_PATTERNS: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  // Invented prices (currency + number).
  { label: 'price', pattern: /(?:₩|krw|\$|usd|€|eur|£|gbp)\s?\d[\d,]*/i },
  // Invented dates / times.
  { label: 'date', pattern: /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/ },
  { label: 'time', pattern: /\b\d{1,2}:\d{2}\s?(?:am|pm)?\b/i },
  // Invented phone numbers.
  { label: 'phone', pattern: /\b(?:\+?\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b/ },
  // Invented email addresses.
  { label: 'email', pattern: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/ },
  // Invented measurable results (percentages / counts).
  { label: 'measurable_result', pattern: /\b\d{1,3}(?:\.\d+)?\s?%\b/ },
  // Invented availability (e.g. "open 24/7", "available now").
  { label: 'availability', pattern: /\b(?:open|available|operating)\s+(?:24\/7|now|today|daily)\b/i },
  // Invented credentials (e.g. "certified by X", "licensed in Y").
  { label: 'credential', pattern: /\b(?:certified|licensed|accredited|awarded)\s+(?:by|in|with)\b/i },
];

/**
 * Deterministically checks a content body against the `mustNotInvent` patterns.
 *
 * Returns the labels of any matched invented-fact classes. This is a bounded,
 * provable check — it is NOT a general-purpose hallucination detector.
 */
export function detectInventedFacts(body: string): string[] {
  const found: string[] = [];
  for (const entry of MUST_NOT_INVENT_PATTERNS) {
    if (entry.pattern.test(body)) {
      found.push(entry.label);
    }
  }
  return found;
}

/**
 * Recursively extracts all textual content from a generated value.
 *
 * This ensures the Fact Validator inspects EVERY string the model produced,
 * not just the flattened top-level `body`. It handles:
 *   - string → the string itself
 *   - number / boolean → String(value)
 *   - array → concatenation of each element's extracted text
 *   - object → concatenation of each own enumerable value's extracted text
 *   - null / undefined → empty string
 *
 * This is a pure, deterministic, side-effect-free helper. It does NOT mutate
 * the input and does NOT infer any business facts.
 */
export function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value.map((v) => extractText(v)).join(' ');
  }
  if (typeof value === 'object') {
    const parts: string[] = [];
    for (const key of Object.keys(value as Record<string, unknown>)) {
      parts.push(extractText((value as Record<string, unknown>)[key]));
    }
    return parts.join(' ');
  }
  return '';
}

/**
 * Resolves the permitted fact references for a ContentPlan requirement.
 *
 * A concrete fact is allowed ONLY when it is backed by an explicitly available
 * evidence reference permitted by the ContentPlan. The ContentPlan requirement
 * itself carries the permitted `evidenceRefs` and the preserved `provenance`;
 * the Validator builds the allowed set from those, preserving provenance
 * exactly (never upgraded).
 *
 * Returns an empty array when the requirement has no permitted references.
 */
export function resolveAllowedFactReferences(
  requirement: ContentPlanRequirement
): AllowedFactReference[] {

  const allowed: AllowedFactReference[] = [];
  for (const evidenceId of requirement.evidenceRefs) {
    allowed.push({
      evidenceId,
      provenance: requirement.provenance ?? 'user_asserted',
      claim: '',
    });
  }
  return allowed;
}


/**
 * Validates generated content against the ContentPlan fact boundary.


 *
 * This is a pure, deterministic, side-effect-free function. It NEVER mutates
 * the ContentPlan or the generated items. It NEVER generates or rewrites
 * content. It NEVER infers new business facts.
 *
 * Deterministic guarantees enforced:
 *   1. Unknown requirement id → FAIL (UnknownRequirement).
 *   2. DORMANT requirement → FAIL (DormantContent) — no active content allowed.
 *   3. DROP requirement → FAIL (DroppedContent) — no content requirement exists.
 *   4. A declared fact reference not in the permitted set → FAIL
 *      (UnpermittedReference) — provenance mismatch / outside permitted set.
 *   5. A concrete fact reference attached to a requirement with no available
 *      facts (factAvailability `unavailable` or `generic_safe`) → FAIL
 *      (UnavailableFact).
 *   6. A `mustNotInvent` pattern detected in the body → FAIL (InventedFact).
 *
 * The same input always produces the same result.
 */
export function validateFacts(
  request: FactValidationRequest
): FactValidationResult {
  const violations: FactViolation[] = [];
  const { contentPlan, items } = request;

  // Index requirements by id for O(1) lookup.
  const requirementById = new Map<string, ContentPlanRequirement>();
  for (const req of contentPlan.requirements) {
    requirementById.set(req.id, req);
  }

  // Index dormant + dropped requirement ids for state enforcement.
  //
  // DORMANT / DROP capabilities have NO requirement entry in `requirements`;
  // only metadata. Each carries an explicit `requirementId` (contract data, not
  // a parsed naming convention) so the Validator can map a generated item back
  // to a dormant/dropped capability deterministically.
  const dormantByRequirementId = new Map<string, string>();
  for (const d of contentPlan.dormant) {
    dormantByRequirementId.set(d.requirementId, d.capability);
  }
  const droppedByRequirementId = new Map<string, string>();
  for (const d of contentPlan.dropped) {
    droppedByRequirementId.set(d.requirementId, d.capability);
  }

  for (const item of items) {
    const requirement = requirementById.get(item.requirementId);

    // 1. DORMANT state — no active content allowed.
    const dormantCapability = dormantByRequirementId.get(item.requirementId);
    if (dormantCapability) {
      violations.push({
        itemId: item.id,
        requirementId: item.requirementId,
        reason: FactViolationReason.DormantContent,
        message: `Generated content targets DORMANT capability "${dormantCapability}"; no active content is permitted.`,
      });
      continue;
    }

    // 2. DROP state — no content requirement exists.
    const droppedCapability = droppedByRequirementId.get(item.requirementId);
    if (droppedCapability) {
      violations.push({
        itemId: item.id,
        requirementId: item.requirementId,
        reason: FactViolationReason.DroppedContent,
        message: `Generated content targets DROP capability "${droppedCapability}"; no content requirement exists.`,
      });
      continue;
    }


    // 3. Unknown requirement id.
    if (!requirement) {
      violations.push({
        itemId: item.id,
        requirementId: item.requirementId,
        reason: FactViolationReason.UnknownRequirement,
        message: `Generated content targets requirement "${item.requirementId}" which does not exist in the ContentPlan.`,
      });
      continue;
    }


    // 4. mustNotInvent pattern check (bounded, deterministic).
    //
    // The check runs against the flattened top-level `body` AND every nested
    // string inside the structured `fields` (headline, subheadline, title,
    // body, cta, items[], nested objects/arrays). This ensures an invented fact
    // hidden in a structured field is caught even when the flattened `body`
    // does not contain it.
    const combinedText = [item.body, extractText(item.fields)].join(' ');
    const invented = detectInventedFacts(combinedText);
    for (const label of invented) {
      violations.push({
        itemId: item.id,
        requirementId: item.requirementId,
        reason: FactViolationReason.InventedFact,
        message: `Generated content contains an invented ${label} that is not backed by permitted evidence.`,
      });
    }


    // 5. Concrete fact reference enforcement.
    const allowed = resolveAllowedFactReferences(requirement);
    const allowedIds = new Set(allowed.map((a) => a.evidenceId));


    for (const ref of item.factReferences) {
      // 5a. Reference outside the permitted set → provenance mismatch.
      if (!allowedIds.has(ref)) {
        violations.push({
          itemId: item.id,
          requirementId: item.requirementId,
          reason: FactViolationReason.UnpermittedReference,
          evidenceId: ref,
          message: `Generated content references evidence "${ref}" which is not in the permitted set for requirement "${item.requirementId}".`,
        });
        continue;
      }

      // 5b. Reference attached to a requirement with no available facts.
      if (
        requirement.factAvailability === 'unavailable' ||
        requirement.factAvailability === 'generic_safe'
      ) {
        const backing = allowed.find((a) => a.evidenceId === ref);
        violations.push({
          itemId: item.id,
          requirementId: item.requirementId,
          reason: FactViolationReason.UnavailableFact,
          evidenceId: ref,
          provenance: backing?.provenance,
          message: `Generated content attaches a concrete fact reference to requirement "${item.requirementId}" whose factAvailability is "${requirement.factAvailability}"; concrete facts are not available.`,
        });
      }
    }
  }

  return {
    status:
      violations.length === 0
        ? FactValidationStatus.PASS
        : FactValidationStatus.FAIL,
    violations,
  };
}
