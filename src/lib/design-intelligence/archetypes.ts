/**
 * AWIE Design Intelligence — Archetype Definitions (FINAL / FROZEN).
 *
 * An Archetype is a coherent visual language. It is the PRIMARY driver of the
 * overall visual decision. Exactly six archetypes exist. No new archetype may
 * be added in this implementation.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - Archetypes are DESIGN decisions (HOW), produced by Design Intelligence.
 *   - They are NOT business decisions (WHAT) — the Brain owns those.
 *   - They are NOT renderer logic — the Renderer consumes the resolved
 *     ThemeConfig, never the archetype itself.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain business logic. It is pure
 * declarative design data.
 */

/** The six frozen archetypes. */
export const Archetype = {
  MINIMAL_EDITORIAL: 'MINIMAL_EDITORIAL',
  WARM_HUMAN: 'WARM_HUMAN',
  TRUST_PROFESSIONAL: 'TRUST_PROFESSIONAL',
  VISUAL_SHOWCASE: 'VISUAL_SHOWCASE',
  MODERN_SERVICE: 'MODERN_SERVICE',
  CALM_WELLNESS: 'CALM_WELLNESS',
} as const;

/** The union of all valid archetype identifiers. */
export type ArchetypeId = (typeof Archetype)[keyof typeof Archetype];

/** Density vocabulary. */
export type Density = 'LOW' | 'NORMAL' | 'HIGH';

/** Spacing vocabulary. */
export type Spacing = 'COMPACT' | 'NORMAL' | 'COMFORTABLE' | 'STRUCTURED' | 'GENEROUS';

/** Border vocabulary. */
export type Border = 'MINIMAL' | 'SUBTLE' | 'SOFT' | 'CLEAN' | 'CLEAR';

/** Radius vocabulary. */
export type Radius = 'LOW' | 'MEDIUM' | 'SOFT' | 'OPTIONAL';

/** Typography vocabulary. */
export type Typography =
  | 'EDITORIAL'
  | 'FRIENDLY'
  | 'PROFESSIONAL'
  | 'NEUTRAL'
  | 'MODERN'
  | 'CALM';

/** Image prominence vocabulary. */
export type ImageProminence = 'LOW' | 'MEDIUM' | 'HIGH' | 'DOMINANT';

/** Image treatment vocabulary. */
export type ImageTreatment = 'NATURAL' | 'CONTROLLED' | 'SUPPORTING' | 'DOMINANT';

/** Decoration vocabulary. */
export type Decoration = 'MINIMAL' | 'LIGHT' | 'SUBTLE' | 'REDUCED';

/** CTA emphasis vocabulary. */
export type CtaEmphasis = 'LOW' | 'MEDIUM' | 'HIGH' | 'PRIMARY' | 'PROMINENT';

/**
 * The full visual attribute set of an archetype.
 *
 * The PRIMARY archetype determines: layout language, spacing, density, body
 * typography, base color, border/radius language.
 */
export interface ArchetypeDefinition {
  /** The archetype identifier. */
  id: ArchetypeId;
  /** A short human-readable label. */
  label: string;
  /** The visual density. */
  density: Density;
  /** The spacing language. */
  spacing: Spacing;
  /** The border language. */
  border: Border;
  /** The radius language. */
  radius: Radius;
  /** The body typography language. */
  typography: Typography;
  /** The image prominence. */
  imageProminence: ImageProminence;
  /** The image treatment. */
  imageTreatment: ImageTreatment;
  /** The decoration level. */
  decoration: Decoration;
  /** The default CTA emphasis. */
  cta: CtaEmphasis;
}

/**
 * The frozen archetype registry.
 *
 * These are the ONLY six archetypes. The values are frozen per the final
 * specification. Design Intelligence selects from this registry; it never
 * invents new archetypes.
 */
export const ARCHETYPES: Record<ArchetypeId, ArchetypeDefinition> = {
  [Archetype.MINIMAL_EDITORIAL]: {
    id: Archetype.MINIMAL_EDITORIAL,
    label: 'Minimal Editorial',
    density: 'LOW',
    spacing: 'GENEROUS',
    border: 'SUBTLE',
    radius: 'LOW',
    typography: 'EDITORIAL',
    imageProminence: 'HIGH',
    imageTreatment: 'DOMINANT',
    decoration: 'MINIMAL',
    cta: 'MEDIUM',
  },
  [Archetype.WARM_HUMAN]: {
    id: Archetype.WARM_HUMAN,
    label: 'Warm Human',
    density: 'NORMAL',
    spacing: 'COMFORTABLE',
    border: 'SOFT',
    radius: 'MEDIUM',
    typography: 'FRIENDLY',
    imageProminence: 'MEDIUM',
    imageTreatment: 'NATURAL',
    decoration: 'LIGHT',
    cta: 'MEDIUM',
  },
  [Archetype.TRUST_PROFESSIONAL]: {
    id: Archetype.TRUST_PROFESSIONAL,
    label: 'Trust Professional',
    density: 'NORMAL',
    spacing: 'STRUCTURED',
    border: 'CLEAR',
    radius: 'LOW',
    typography: 'PROFESSIONAL',
    imageProminence: 'MEDIUM',
    imageTreatment: 'CONTROLLED',
    decoration: 'MINIMAL',
    cta: 'HIGH',
  },
  [Archetype.VISUAL_SHOWCASE]: {
    id: Archetype.VISUAL_SHOWCASE,
    label: 'Visual Showcase',
    density: 'LOW',
    spacing: 'GENEROUS',
    border: 'MINIMAL',
    radius: 'OPTIONAL',
    typography: 'NEUTRAL',
    imageProminence: 'DOMINANT',
    imageTreatment: 'DOMINANT',
    decoration: 'MINIMAL',
    cta: 'MEDIUM',
  },
  [Archetype.MODERN_SERVICE]: {
    id: Archetype.MODERN_SERVICE,
    label: 'Modern Service',
    density: 'NORMAL',
    spacing: 'STRUCTURED',
    border: 'CLEAN',
    radius: 'MEDIUM',
    typography: 'MODERN',
    imageProminence: 'MEDIUM',
    imageTreatment: 'SUPPORTING',
    decoration: 'LIGHT',
    cta: 'HIGH',
  },
  [Archetype.CALM_WELLNESS]: {
    id: Archetype.CALM_WELLNESS,
    label: 'Calm Wellness',
    density: 'LOW',
    spacing: 'GENEROUS',
    border: 'SOFT',
    radius: 'SOFT',
    typography: 'CALM',
    imageProminence: 'MEDIUM',
    imageTreatment: 'NATURAL',
    decoration: 'SUBTLE',
    cta: 'MEDIUM',
  },
};

/** The default archetype used as a fallback for unknown archetypes. */
export const DEFAULT_ARCHETYPE: ArchetypeId = Archetype.MODERN_SERVICE;

/**
 * Resolves an archetype id to its definition, falling back to the default
 * archetype for unknown values. This guarantees no white screen.
 */
export function resolveArchetype(id: string | undefined): ArchetypeDefinition {
  if (id && id in ARCHETYPES) {
    return ARCHETYPES[id as ArchetypeId];
  }
  return ARCHETYPES[DEFAULT_ARCHETYPE];
}
