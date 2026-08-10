/**
 * AWIE Design Intelligence — Engine.
 *
 * Design Intelligence consumes the Brain's outputs (BusinessMeaning,
 * DecisionPlan, ContentPlan) and produces a VisualDesignDecision. It is the
 * HOW layer. It NEVER re-interprets the user's one-line input, NEVER creates a
 * second Brain, and NEVER makes business decisions.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - INPUT  : BusinessMeaning (WHAT), DecisionPlan (WHAT), ContentPlan (CONTENT)
 *   - OUTPUT : VisualDesignDecision (HOW)
 *   - The VisualDesignDecision is written into ThemeConfig by the bridge.
 *   - The Renderer consumes the ThemeConfig, never this decision directly.
 *
 * PRIORITY / CONFLICT RESOLUTION (final):
 *   1. PRIMARY BUSINESS PURPOSE
 *   2. ACTIVE CAPABILITY
 *   3. CONTENT PRIORITY
 *   4. PRIMARY ARCHETYPE
 *   5. SECONDARY ARCHETYPE
 *   6. DECORATION
 *
 * STRICT CONSTRAINT: This module MUST NOT contain renderer logic. It is pure
 * design decision resolution.
 */

import type { BusinessMeaning } from '../brain/business-meaning';
import type { DecisionPlan } from '../brain/decision-plan';
import type { ContentPlan } from '../brain/content-plan';
import type { CapabilityId } from '../brain/capability';
import { resolveArchetype, type ArchetypeId } from './archetypes';
import {
  CAPABILITY_VISUAL_INFLUENCE,
  DEFAULT_PURPOSE,
  PURPOSE_VISUAL_RULES,
} from './rules';
import {
  BusinessPurpose,
  DEFAULT_HERO_VARIANT,
  type BusinessPurposeValue,
  type CtaPriorityValue,
  type HeroVariantId,
  type ImageTreatmentValue,
  type SectionPlan,
  type VisualDesignDecision,
} from './types';

/** The input contract for Design Intelligence. */
export interface DesignIntelligenceInput {
  /** The Brain's normalized business meaning. */
  businessMeaning: BusinessMeaning;
  /** The Brain's decision plan. */
  decisionPlan: DecisionPlan;
  /** The Brain's content plan. */
  contentPlan: ContentPlan;
}

/**
 * Resolves the primary business purpose from the Brain's intent and active
 * capabilities. This is the TOP priority in conflict resolution.
 *
 * The purpose is derived deterministically:
 *   - showcase intent  → PORTFOLIO
 *   - book intent      → BOOKING
 *   - transact intent  → PRODUCT
 *   - establish_trust  → TRUST_SENSITIVE
 *   - inform intent    → EDITORIAL (when no conversion capability is active)
 *   - convert intent   → SERVICE_BASED (default conversion purpose)
 *   - wellness traits  → WELLNESS
 *
 * Active capabilities refine the purpose only when the intent is ambiguous.
 */
export function resolveBusinessPurpose(
  input: DesignIntelligenceInput
): BusinessPurposeValue {
  const { businessMeaning, decisionPlan } = input;
  const intent = businessMeaning.primaryIntent;
  const active = activeCapabilities(decisionPlan);

  // Wellness is a strong signal from traits.
  if (hasTrait(businessMeaning, 'wellness')) {
    return BusinessPurpose.WELLNESS;
  }

  // The Brain's semantic signals (businessType trait) refine the purpose when
  // the intent is ambiguous. Design Intelligence consumes the Brain's
  // normalized meaning — it never re-interprets the user's raw input.
  const businessType = traitValue(businessMeaning, 'businessType');

  switch (intent) {
    case 'showcase':
      return BusinessPurpose.PORTFOLIO;
    case 'book':
      return BusinessPurpose.BOOKING;
    case 'transact':
      return BusinessPurpose.PRODUCT;
    case 'establish_trust':
      return BusinessPurpose.TRUST_SENSITIVE;
    case 'inform':
      // Inform-only sites are editorial unless a conversion capability is
      // active or the business type signals a conversion-oriented purpose.
      if (active.has('booking')) return BusinessPurpose.BOOKING;
      if (active.has('purchase')) return BusinessPurpose.PRODUCT;
      return purposeFromBusinessType(businessType) ?? BusinessPurpose.EDITORIAL;
    case 'convert':
    default:
      // Conversion intent defaults to service-based, refined by capabilities.
      if (active.has('booking')) return BusinessPurpose.BOOKING;
      if (active.has('purchase')) return BusinessPurpose.PRODUCT;
      if (active.has('trust')) return BusinessPurpose.TRUST_SENSITIVE;
      return purposeFromBusinessType(businessType) ?? BusinessPurpose.SERVICE_BASED;
  }
}


/**
 * Resolves the primary archetype from the business purpose.
 *
 * The PRIMARY archetype determines the overall visual language: layout,
 * spacing, density, body typography, base color, border/radius.
 */
export function resolvePrimaryArchetype(
  purpose: BusinessPurposeValue
): ArchetypeId {
  switch (purpose) {
    case BusinessPurpose.PORTFOLIO:
      return 'VISUAL_SHOWCASE';
    case BusinessPurpose.BOOKING:
      return 'MODERN_SERVICE';
    case BusinessPurpose.PRODUCT:
      return 'MINIMAL_EDITORIAL';
    case BusinessPurpose.TRUST_SENSITIVE:
      return 'TRUST_PROFESSIONAL';
    case BusinessPurpose.EDITORIAL:
      return 'MINIMAL_EDITORIAL';
    case BusinessPurpose.WELLNESS:
      return 'CALM_WELLNESS';
    case BusinessPurpose.SERVICE_BASED:
    default:
      return 'MODERN_SERVICE';
  }
}

/**
 * Resolves the secondary archetype.
 *
 * The SECONDARY archetype may only influence: accent color, heading typography,
 * and CTA treatment. It NEVER overrides the primary layout or structure.
 */
export function resolveSecondaryArchetype(
  purpose: BusinessPurposeValue,
  decisionPlan: DecisionPlan
): ArchetypeId | undefined {
  const active = activeCapabilities(decisionPlan);

  // A warm/human secondary archetype adds a friendly accent to otherwise
  // professional or service-oriented sites.
  if (active.has('trust') && purpose !== BusinessPurpose.TRUST_SENSITIVE) {
    return 'WARM_HUMAN';
  }
  // Wellness sites keep a calm secondary accent.
  if (purpose === BusinessPurpose.WELLNESS) {
    return 'CALM_WELLNESS';
  }
  // Portfolio sites may use a warm secondary accent for the CTA.
  if (purpose === BusinessPurpose.PORTFOLIO) {
    return 'WARM_HUMAN';
  }
  return undefined;
}

/**
 * Resolves the hero variant from the business purpose.
 *
 * The purpose's hero variant is the DEFAULT. Active capabilities may refine it
 * only within the bounds of the purpose (never overriding the purpose's
 * structural intent).
 */
export function resolveHeroVariant(
  purpose: BusinessPurposeValue,
  decisionPlan: DecisionPlan
): HeroVariantId {
  const rule = PURPOSE_VISUAL_RULES[purpose];
  const active = activeCapabilities(decisionPlan);

  // Booking capability always pushes toward a CTA-focused hero.
  if (active.has('booking')) return 'CTA_FOCUS';
  // Portfolio capability pushes toward an image-focused hero.
  if (active.has('discovery') && purpose === BusinessPurpose.PORTFOLIO) {
    return 'IMAGE_FOCUS';
  }
  return rule?.heroVariant ?? DEFAULT_HERO_VARIANT;
}

/**
 * Resolves the CTA priority.
 *
 * The purpose sets the base CTA priority. Active capabilities may raise it
 * (never lower it below the purpose's base).
 */
export function resolveCtaPriority(
  purpose: BusinessPurposeValue,
  decisionPlan: DecisionPlan
): CtaPriorityValue {
  const base = PURPOSE_VISUAL_RULES[purpose]?.ctaPriority ?? 'MEDIUM';
  const active = activeCapabilities(decisionPlan);
  const rank: Record<CtaPriorityValue, number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    PRIMARY: 3,
  };

  let result: CtaPriorityValue = base;
  for (const capability of active) {
    const influence = CAPABILITY_VISUAL_INFLUENCE[capability];
    if (influence?.ctaPriority && rank[influence.ctaPriority] > rank[result]) {
      result = influence.ctaPriority;
    }
  }
  return result;
}

/**
 * Resolves the image treatment.
 *
 * The purpose sets the base image treatment. Active capabilities may refine it
 * within the bounds of the purpose.
 */
export function resolveImageTreatment(
  purpose: BusinessPurposeValue,
  decisionPlan: DecisionPlan
): ImageTreatmentValue {
  const base = PURPOSE_VISUAL_RULES[purpose]?.imageTreatment ?? 'SUPPORTING';
  const active = activeCapabilities(decisionPlan);

  // Trust-sensitive sites always use controlled imagery.
  if (purpose === BusinessPurpose.TRUST_SENSITIVE) return 'CONTROLLED';
  // Portfolio sites always use dominant imagery.
  if (purpose === BusinessPurpose.PORTFOLIO) return 'DOMINANT';

  for (const capability of active) {
    const influence = CAPABILITY_VISUAL_INFLUENCE[capability];
    if (influence?.imageTreatment) return influence.imageTreatment;
  }
  return base;
}

/**
 * Resolves the ordered section plan.
 *
 * The purpose defines the default section order. If the ContentPlan provides a
 * more specific order, it is used instead (per the final spec: "기존
 * ContentPlan이 더 구체적인 순서를 제공하면 그 결과를 우선 사용한다").
 */
export function resolveSectionPlan(
  purpose: BusinessPurposeValue,
  decisionPlan: DecisionPlan,
  contentPlan: ContentPlan
): SectionPlan[] {
  const rule = PURPOSE_VISUAL_RULES[purpose];
  const base = rule?.sections ?? [];

  // If the content plan has explicit requirements, derive a more specific order.
  const contentOrder = deriveContentOrder(contentPlan);
  if (contentOrder.length > 0) {
    return mergeSectionPlans(base, contentOrder);
  }
  return base;
}

/**
 * Builds the complete VisualDesignDecision.
 *
 * This is the single entry point of Design Intelligence. It is deterministic
 * and side-effect-free. Every field has a fallback so no input can produce a
 * white screen.
 */
export function buildVisualDesignDecision(
  input: DesignIntelligenceInput
): VisualDesignDecision {
  const purpose = resolveBusinessPurpose(input);
  const primaryArchetype = resolvePrimaryArchetype(purpose);
  const secondaryArchetype = resolveSecondaryArchetype(purpose, input.decisionPlan);
  const heroVariant = resolveHeroVariant(purpose, input.decisionPlan);
  const ctaPriority = resolveCtaPriority(purpose, input.decisionPlan);
  const imageTreatment = resolveImageTreatment(purpose, input.decisionPlan);
  const sections = resolveSectionPlan(purpose, input.decisionPlan, input.contentPlan);

  const archetype = resolveArchetype(primaryArchetype);

  return {
    primaryArchetype,
    secondaryArchetype,
    businessPurpose: purpose,
    heroVariant,
    ctaPriority,
    imageTreatment,
    density: archetype.density,
    spacing: archetype.spacing,
    border: archetype.border,
    radius: archetype.radius,
    typography: archetype.typography,
    decoration: archetype.decoration,
    sections,
    rationale: buildRationale(purpose, primaryArchetype, heroVariant, ctaPriority),
  };
}

/** Returns the set of ACTIVE capabilities from the decision plan. */
function activeCapabilities(decisionPlan: DecisionPlan): Set<CapabilityId> {
  const set = new Set<CapabilityId>();
  for (const planned of decisionPlan.capabilities) {
    if (planned.state === 'ACTIVE') set.add(planned.capability);
  }
  return set;
}

/** Returns true if the business meaning carries the given trait key. */
function hasTrait(businessMeaning: BusinessMeaning, key: string): boolean {
  return businessMeaning.traits.some((t) => t.key === key);
}

/** Returns the value of the given trait key, if present. */
function traitValue(
  businessMeaning: BusinessMeaning,
  key: string
): string | undefined {
  return businessMeaning.traits.find((t) => t.key === key)?.value;
}

/**
 * Refines the business purpose from the Brain's normalized businessType trait.
 *
 * This is a deterministic mapping of the Brain's semantic signal. It is used
 * ONLY when the intent is ambiguous (inform/convert) so that different
 * businesses produce structurally different designs. It never re-interprets the
 * user's raw input — it consumes the Brain's already-normalized meaning.
 */
function purposeFromBusinessType(
  businessType: string | undefined
): BusinessPurposeValue | undefined {
  if (!businessType) return undefined;
  const t = businessType.toLowerCase();

  // Portfolio / showcase businesses.
  if (
    t.includes('photographer') ||
    t.includes('사진') ||
    t.includes('작가') ||
    t.includes('portfolio') ||
    t.includes('studio') ||
    t.includes('스튜디오')
  ) {
    return BusinessPurpose.PORTFOLIO;
  }
  // Booking / reservation businesses.
  if (
    t.includes('yoga') ||
    t.includes('요가') ||
    t.includes('pilates') ||
    t.includes('필라테스') ||
    t.includes('class') ||
    t.includes('클래스') ||
    t.includes('academy') ||
    t.includes('학원') ||
    t.includes('reservation') ||
    t.includes('예약')
  ) {
    return BusinessPurpose.BOOKING;
  }
  // Product / menu businesses.
  if (
    t.includes('tart') ||
    t.includes('타르트') ||
    t.includes('bakery') ||
    t.includes('베이커리') ||
    t.includes('cafe') ||
    t.includes('카페') ||
    t.includes('restaurant') ||
    t.includes('식당') ||
    t.includes('product') ||
    t.includes('제품') ||
    t.includes('menu') ||
    t.includes('메뉴') ||
    t.includes('공방') ||
    t.includes('craft')
  ) {
    return BusinessPurpose.PRODUCT;
  }
  // Trust-sensitive businesses.
  if (
    t.includes('law') ||
    t.includes('법률') ||
    t.includes('hospital') ||
    t.includes('병원') ||
    t.includes('clinic') ||
    t.includes('의원') ||
    t.includes('accounting') ||
    t.includes('회계') ||
    t.includes('consulting') ||
    t.includes('컨설팅')
  ) {
    return BusinessPurpose.TRUST_SENSITIVE;
  }
  // Wellness businesses.
  if (
    t.includes('wellness') ||
    t.includes('웰니스') ||
    t.includes('spa') ||
    t.includes('스파') ||
    t.includes('healing') ||
    t.includes('힐링')
  ) {
    return BusinessPurpose.WELLNESS;
  }
  // Service businesses.
  if (
    t.includes('service') ||
    t.includes('서비스') ||
    t.includes('agency') ||
    t.includes('에이전시') ||
    t.includes('company') ||
    t.includes('회사')
  ) {
    return BusinessPurpose.SERVICE_BASED;
  }
  return undefined;
}


/** Derives a section order from the content plan's requirements. */
function deriveContentOrder(contentPlan: ContentPlan): SectionPlan[] {
  const order: SectionPlan[] = [];
  const seen = new Set<string>();

  for (const req of contentPlan.requirements) {
    const section = contentRequirementToSection(req.capability);
    if (section && !seen.has(section.type)) {
      seen.add(section.type);
      order.push(section);
    }
  }
  return order;
}

/** Maps a capability to a section plan entry. */
function contentRequirementToSection(
  capability: CapabilityId
): SectionPlan | null {
  switch (capability) {
    case 'discovery':
      return { type: 'services', variant: 'CARD_GRID', label: 'Services' };
    case 'purchase':
      return { type: 'gallery', variant: 'GRID', label: 'Products' };
    case 'booking':
      return { type: 'booking', variant: 'PROMINENT_ACTION', label: 'Booking' };
    case 'inquiry':
      return { type: 'contact', variant: 'INFO_FORM', label: 'Contact' };
    case 'lead_capture':
      return { type: 'contact', variant: 'FORM', label: 'Contact' };
    case 'location':
      return { type: 'contact', variant: 'INFO', label: 'Location' };
    case 'trust':
      return { type: 'about', variant: 'PROFILE', label: 'About' };
    default:
      return null;
  }
}

/** Merges the purpose's base section plan with a content-derived order. */
function mergeSectionPlans(
  base: SectionPlan[],
  contentOrder: SectionPlan[]
): SectionPlan[] {
  // Start with the base plan, then append any content-derived sections not
  // already present. This preserves the purpose's structural intent while
  // honoring the content plan's specificity.
  const merged = [...base];
  const existing = new Set(merged.map((s) => s.type));
  for (const section of contentOrder) {
    if (!existing.has(section.type)) {
      merged.push(section);
      existing.add(section.type);
    }
  }
  return merged;
}

/** Builds a short human-readable rationale. */
function buildRationale(
  purpose: BusinessPurposeValue,
  archetype: ArchetypeId,
  heroVariant: HeroVariantId,
  ctaPriority: CtaPriorityValue
): string {
  return `Purpose ${purpose} → archetype ${archetype}, hero ${heroVariant}, CTA ${ctaPriority}.`;
}
