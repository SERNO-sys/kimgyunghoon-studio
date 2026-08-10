/**
 * AWIE Design Intelligence — Capability → Visual Rule mapping.
 *
 * These rules translate the Brain's ACTIVE capabilities into visual decisions.
 * They are DESIGN rules (HOW), owned by Design Intelligence. The Renderer never
 * applies them — Design Intelligence resolves them into the ThemeConfig.
 *
 * PRIORITY / CONFLICT RESOLUTION (final):
 *   1. PRIMARY BUSINESS PURPOSE
 *   2. ACTIVE CAPABILITY
 *   3. CONTENT PRIORITY
 *   4. PRIMARY ARCHETYPE
 *   5. SECONDARY ARCHETYPE
 *   6. DECORATION
 *
 * A lower-priority rule must never override a higher-priority rule.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain business logic. It is pure
 * declarative design data.
 */

import type { CapabilityId } from '../brain/capability';
import type {
  BusinessPurposeValue,
  CtaPriorityValue,
  HeroVariantId,
  ImageTreatmentValue,
  RenderableVariantId,
} from './types';


/** The visual rule for a single business purpose. */
export interface PurposeVisualRule {
  /** The business purpose. */
  purpose: BusinessPurposeValue;
  /** The hero variant for this purpose. */
  heroVariant: HeroVariantId;
  /** The CTA priority for this purpose. */
  ctaPriority: CtaPriorityValue;
  /** The image treatment for this purpose. */
  imageTreatment: ImageTreatmentValue;
  /** The ordered section plan (type → variant → label). */
  sections: { type: string; variant: RenderableVariantId; label: string }[];

}

/**
 * The frozen purpose → visual rule mapping.
 *
 * This is the single source of truth for how a business purpose maps to a
 * visual structure. It is declarative and frozen per the final specification.
 */
export const PURPOSE_VISUAL_RULES: Record<BusinessPurposeValue, PurposeVisualRule> = {
  PORTFOLIO: {
    purpose: 'PORTFOLIO',
    heroVariant: 'IMAGE_FOCUS',
    ctaPriority: 'MEDIUM',
    imageTreatment: 'DOMINANT',
    sections: [
      { type: 'hero', variant: 'IMAGE_FOCUS', label: 'Hero' },
      { type: 'gallery', variant: 'FEATURED', label: 'Featured Work' },
      { type: 'gallery', variant: 'GRID', label: 'Gallery' },
      { type: 'about', variant: 'PROFILE', label: 'About' },
      { type: 'contact', variant: 'INFO_FORM', label: 'Contact' },
    ],
  },
  BOOKING: {
    purpose: 'BOOKING',
    heroVariant: 'CTA_FOCUS',
    ctaPriority: 'PRIMARY',
    imageTreatment: 'SUPPORTING',
    sections: [
      { type: 'hero', variant: 'CTA_FOCUS', label: 'Hero' },
      { type: 'booking', variant: 'PROMINENT_ACTION', label: 'Booking' },
      { type: 'services', variant: 'CARD_GRID', label: 'Services' },
      { type: 'about', variant: 'TEXT', label: 'About' },
      { type: 'contact', variant: 'INFO_FORM', label: 'Contact' },
    ],
  },
  SERVICE_BASED: {
    purpose: 'SERVICE_BASED',
    heroVariant: 'SPLIT',
    ctaPriority: 'HIGH',
    imageTreatment: 'SUPPORTING',
    sections: [
      { type: 'hero', variant: 'SPLIT', label: 'Hero' },
      { type: 'services', variant: 'CARD_GRID', label: 'Services' },
      { type: 'about', variant: 'IMAGE_TEXT', label: 'About' },
      { type: 'contact', variant: 'INFO_FORM', label: 'Contact' },
    ],
  },
  PRODUCT: {
    purpose: 'PRODUCT',
    heroVariant: 'SPLIT',
    ctaPriority: 'HIGH',
    imageTreatment: 'CONTROLLED',
    sections: [
      { type: 'hero', variant: 'SPLIT', label: 'Hero' },
      { type: 'gallery', variant: 'GRID', label: 'Featured Products' },
      { type: 'gallery', variant: 'GRID', label: 'Products' },
      { type: 'about', variant: 'TEXT', label: 'Story' },
      { type: 'contact', variant: 'INFO_FORM', label: 'Contact' },
    ],
  },
  TRUST_SENSITIVE: {
    purpose: 'TRUST_SENSITIVE',
    heroVariant: 'TEXT_FOCUS',
    ctaPriority: 'HIGH',
    imageTreatment: 'CONTROLLED',
    sections: [
      { type: 'hero', variant: 'TEXT_FOCUS', label: 'Hero' },
      { type: 'services', variant: 'FEATURED', label: 'Core Services' },
      { type: 'about', variant: 'PROFILE', label: 'About' },
      { type: 'contact', variant: 'INFO_FORM', label: 'Contact' },
    ],
  },
  EDITORIAL: {
    purpose: 'EDITORIAL',
    heroVariant: 'MINIMAL',
    ctaPriority: 'MEDIUM',
    imageTreatment: 'DOMINANT',
    sections: [
      { type: 'hero', variant: 'MINIMAL', label: 'Hero' },
      { type: 'gallery', variant: 'FEATURED', label: 'Featured' },
      { type: 'about', variant: 'TEXT', label: 'About' },
      { type: 'contact', variant: 'INFO', label: 'Contact' },
    ],
  },
  WELLNESS: {
    purpose: 'WELLNESS',
    heroVariant: 'CENTERED',
    ctaPriority: 'MEDIUM',
    imageTreatment: 'NATURAL',
    sections: [
      { type: 'hero', variant: 'CENTERED', label: 'Hero' },
      { type: 'services', variant: 'CARD_GRID', label: 'Programs' },
      { type: 'about', variant: 'IMAGE_TEXT', label: 'About' },
      { type: 'contact', variant: 'INFO_FORM', label: 'Contact' },
    ],
  },
};

/**
 * The capability → visual influence mapping.
 *
 * ACTIVE capabilities can adjust the visual decision within the bounds set by
 * the primary business purpose. A capability NEVER overrides the purpose's
 * hero variant or section order — it only refines CTA priority and image
 * treatment (lower priority than purpose).
 */
export const CAPABILITY_VISUAL_INFLUENCE: Record<
  CapabilityId,
  { ctaPriority?: CtaPriorityValue; imageTreatment?: ImageTreatmentValue }
> = {
  discovery: { imageTreatment: 'CONTROLLED' },
  purchase: { ctaPriority: 'HIGH', imageTreatment: 'CONTROLLED' },
  booking: { ctaPriority: 'PRIMARY' },
  inquiry: { ctaPriority: 'MEDIUM' },
  lead_capture: { ctaPriority: 'HIGH' },
  location: {},
  trust: { ctaPriority: 'HIGH', imageTreatment: 'CONTROLLED' },
};

/** The default purpose used as a fallback. */
export const DEFAULT_PURPOSE: BusinessPurposeValue = 'SERVICE_BASED';
