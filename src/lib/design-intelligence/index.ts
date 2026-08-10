/**
 * AWIE Design Intelligence — public entry point.
 *
 * Design Intelligence consumes the Brain's outputs and produces a
 * VisualDesignDecision (HOW). The ThemeConfig bridge writes that decision into
 * the renderer-facing ThemeConfig.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - Design Intelligence is the HOW layer.
 *   - It NEVER re-interprets the user's one-line input.
 *   - It NEVER creates a second Brain.
 *   - The Renderer consumes the ThemeConfig, never this decision directly.
 */

export * from './types';
export * from './rules';
export * from './engine';
export * from './theme-config-bridge';


// Archetypes are re-exported explicitly to avoid the `ImageTreatment` name
// collision between the `types.ts` const and the `archetypes.ts` type.
export {
  Archetype,
  ARCHETYPES,
  DEFAULT_ARCHETYPE,
  resolveArchetype,
} from './archetypes';
export type {
  ArchetypeId,
  Density,
  Spacing,
  Border,
  Radius,
  Typography,
  ImageProminence,
  Decoration,
  CtaEmphasis,
  ArchetypeDefinition,
} from './archetypes';
