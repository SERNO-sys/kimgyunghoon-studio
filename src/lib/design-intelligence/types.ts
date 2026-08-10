/**
 * AWIE Design Intelligence — Visual Design Decision types.
 *
 * A VisualDesignDecision is the OUTPUT of Design Intelligence. It is a pure
 * DESIGN decision (HOW) that the ThemeConfig bridge consumes to populate the
 * renderer-facing ThemeConfig. It is NOT a business decision (WHAT) and NOT
 * renderer logic.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - Design Intelligence consumes Brain outputs (BusinessMeaning, DecisionPlan,
 *     ContentPlan) and produces a VisualDesignDecision.
 *   - The VisualDesignDecision is written into ThemeConfig.resources.settings
 *     and ThemeConfig.resources.sections[].settings.
 *   - The Renderer consumes the ThemeConfig, never this decision directly.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain business logic. It is pure
 * data modeling.
 */

import type { ArchetypeId } from './archetypes';

/** The six final hero variants. */
export const HeroVariant = {
  CENTERED: 'CENTERED',
  SPLIT: 'SPLIT',
  IMAGE_FOCUS: 'IMAGE_FOCUS',
  TEXT_FOCUS: 'TEXT_FOCUS',
  MINIMAL: 'MINIMAL',
  CTA_FOCUS: 'CTA_FOCUS',
} as const;

/** The union of all valid hero variants. */
export type HeroVariantId = (typeof HeroVariant)[keyof typeof HeroVariant];

/** The default hero variant used as a fallback. */
export const DEFAULT_HERO_VARIANT: HeroVariantId = HeroVariant.CENTERED;

/** Gallery section variants. */
export const GalleryVariant = {
  GRID: 'GRID',
  FEATURED: 'FEATURED',
  MASONRY: 'MASONRY',
  HORIZONTAL: 'HORIZONTAL',
} as const;
export type GalleryVariantId = (typeof GalleryVariant)[keyof typeof GalleryVariant];

/** Services section variants. */
export const ServicesVariant = {
  CARD_GRID: 'CARD_GRID',
  LIST: 'LIST',
  FEATURED: 'FEATURED',
} as const;
export type ServicesVariantId = (typeof ServicesVariant)[keyof typeof ServicesVariant];

/** About section variants. */
export const AboutVariant = {
  TEXT: 'TEXT',
  PROFILE: 'PROFILE',
  IMAGE_TEXT: 'IMAGE_TEXT',
} as const;
export type AboutVariantId = (typeof AboutVariant)[keyof typeof AboutVariant];

/** Contact section variants. */
export const ContactVariant = {
  INFO: 'INFO',
  FORM: 'FORM',
  INFO_FORM: 'INFO_FORM',
} as const;
export type ContactVariantId = (typeof ContactVariant)[keyof typeof ContactVariant];

/** Booking section variants. */
export const BookingVariant = {
  CTA: 'CTA',
  BOOKING_CARD: 'BOOKING_CARD',
  PROMINENT_ACTION: 'PROMINENT_ACTION',
} as const;
export type BookingVariantId = (typeof BookingVariant)[keyof typeof BookingVariant];

/** The union of all section variants. */
export type SectionVariantId =
  | GalleryVariantId
  | ServicesVariantId
  | AboutVariantId
  | ContactVariantId
  | BookingVariantId;

/** The union of all renderable variants (hero + section). */
export type RenderableVariantId = HeroVariantId | SectionVariantId;

/** CTA priority vocabulary. */
export const CtaPriority = {
  PRIMARY: 'PRIMARY',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;
export type CtaPriorityValue = (typeof CtaPriority)[keyof typeof CtaPriority];

/** Image treatment vocabulary (renderer-facing). */
export const ImageTreatment = {
  NATURAL: 'NATURAL',
  CONTROLLED: 'CONTROLLED',
  SUPPORTING: 'SUPPORTING',
  DOMINANT: 'DOMINANT',
} as const;
export type ImageTreatmentValue = (typeof ImageTreatment)[keyof typeof ImageTreatment];

/** The primary business purpose, used as the top priority in conflict resolution. */
export const BusinessPurpose = {
  PORTFOLIO: 'PORTFOLIO',
  BOOKING: 'BOOKING',
  SERVICE_BASED: 'SERVICE_BASED',
  PRODUCT: 'PRODUCT',
  TRUST_SENSITIVE: 'TRUST_SENSITIVE',
  EDITORIAL: 'EDITORIAL',
  WELLNESS: 'WELLNESS',
} as const;
export type BusinessPurposeValue = (typeof BusinessPurpose)[keyof typeof BusinessPurpose];

/** A single section in the ordered section plan. */
export interface SectionPlan {
  /** The section type (hero, gallery, services, about, contact, booking, ...). */
  type: string;
  /** The section variant (hero sections use a hero variant). */
  variant: RenderableVariantId;
  /** The section label (used for headings). */
  label: string;
}

/**
 * The resolved visual design decision.
 *
 * This is the complete set of design decisions the ThemeConfig bridge needs to
 * populate the renderer-facing ThemeConfig. Every field has a fallback so no
 * decision can produce a white screen.
 */
export interface VisualDesignDecision {
  /** The primary archetype (overall visual language). */
  primaryArchetype: ArchetypeId;
  /** The secondary archetype (accent color, heading typography, CTA treatment only). */
  secondaryArchetype?: ArchetypeId;
  /** The primary business purpose (top priority in conflict resolution). */
  businessPurpose: BusinessPurposeValue;
  /** The hero variant. */
  heroVariant: HeroVariantId;
  /** The CTA priority. */
  ctaPriority: CtaPriorityValue;
  /** The image treatment. */
  imageTreatment: ImageTreatmentValue;
  /** The visual density. */
  density: 'LOW' | 'NORMAL' | 'HIGH';
  /** The spacing language. */
  spacing: 'COMPACT' | 'NORMAL' | 'COMFORTABLE' | 'STRUCTURED' | 'GENEROUS';
  /** The border language. */
  border: 'MINIMAL' | 'SUBTLE' | 'SOFT' | 'CLEAN' | 'CLEAR';
  /** The radius language. */
  radius: 'LOW' | 'MEDIUM' | 'SOFT' | 'OPTIONAL';
  /** The body typography language. */
  typography: 'EDITORIAL' | 'FRIENDLY' | 'PROFESSIONAL' | 'NEUTRAL' | 'MODERN' | 'CALM';
  /** The decoration level. */
  decoration: 'MINIMAL' | 'LIGHT' | 'SUBTLE' | 'REDUCED';
  /** The ordered section plan (section type → variant). */
  sections: SectionPlan[];
  /** A short human-readable rationale for the design decision. */
  rationale: string;
}
