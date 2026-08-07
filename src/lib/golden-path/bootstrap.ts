/**
 * AWIE V2 - Golden Path Bootstrap (Phase 12, Integration).
 *
 * The Bootstrap layer populates and freezes the O(1) registries that the
 * ThemeEngine consumes. It is the ONLY place where the framework-agnostic
 * section renderers are wired to the React presentation components.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. REGISTRY-DRIVEN
 *      Everything is resolved through O(1) registries. No Array.find(), no
 *      switch/case resolution. The Bootstrap populates the registries; the
 *      ThemeEngine consumes them.
 *
 *   2. SEPARATION OF CONCERNS
 *      - The framework-agnostic ComponentRegistry holds the section renderers
 *        (which translate sections to semantic props).
 *      - The ReactComponentRegistry holds the React presentation components
 *        (which render the semantic props).
 *      The Bootstrap wires them together by componentId.
 *
 *   3. FREEZING
 *      The Bootstrap freezes the registries after population, guaranteeing
 *      reproducible renders. Freezing is the Bootstrap's responsibility, NOT
 *      the ThemeEngine's.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure composition.
 */

import {
  InMemoryResourceRegistry,
  type ComponentRegistry,
  type LayoutRegistry,
  type SkinRegistry,
  type TypographyRegistry,
} from '../renderer-foundation';
import {
  Hero,
  InMemoryReactComponentRegistry,
  Text,
  type ReactComponentRegistry,
} from '../renderer-react';
import { DEFAULT_SECTION_RENDERERS } from './section-renderers';
import type { GoldenPathRegistries } from './types';

/**
 * The default layout renderer.
 *
 * A composition wrapper that arranges the page's section RenderNodes in order.
 * It is a DUMB wrapper: it NEVER renders business components directly. It only
 * wraps the already-rendered section nodes in a fragment.
 */
const defaultLayout = {
  name: 'golden-path.default-layout',
  render(sections: import('../renderer-foundation').RenderNode[]): import('../renderer-foundation').RenderNode {
    return {
      type: 'fragment',
      children: sections,
      metadata: { layoutId: 'default' },
    };
  },
};

/**
 * The default skin resource.
 *
 * A named bundle of visual tokens. It is derived from ThemeConfig settings but
 * registered as a reusable resource. This is a minimal default; real skins are
 * registered by the theme ecosystem.
 */
const defaultSkin = {
  id: 'default',
  colors: {},
  radius: {},
  shadows: {},
  motion: {},
};

/**
 * The default typography resource.
 *
 * A named bundle of font tokens. This is a minimal default; real typography is
 * registered by the theme ecosystem.
 */
const defaultTypography = {
  id: 'default',
  families: {},
  sizes: {},
  weights: {},
  lineHeights: {},
};

/**
 * Builds the Golden Path registries.
 *
 * Populates the framework-agnostic registries (components, layouts, skins,
 * typography) with the default section renderers and the React component
 * registry with the semantic presentation components. Then freezes all
 * registries to guarantee reproducible renders.
 *
 * @returns The populated and frozen GoldenPathRegistries.
 */
export function buildGoldenPathRegistries(): GoldenPathRegistries {
  // Framework-agnostic component registry: section type -> section renderer.
  const components: ComponentRegistry = new InMemoryResourceRegistry();
  for (const [sectionType, renderer] of Object.entries(DEFAULT_SECTION_RENDERERS)) {
    components.register(sectionType, renderer);
  }

  // Framework-agnostic layout registry.
  const layouts: LayoutRegistry = new InMemoryResourceRegistry();
  layouts.register('default', defaultLayout);

  // Framework-agnostic skin + typography registries.
  const skins: SkinRegistry = new InMemoryResourceRegistry();
  skins.register('default', defaultSkin);

  const typography: TypographyRegistry = new InMemoryResourceRegistry();
  typography.register('default', defaultTypography);

  // React component registry: componentId -> React presentation component.
  const reactComponents: ReactComponentRegistry = new InMemoryReactComponentRegistry();
  reactComponents.register('hero', Hero);
  reactComponents.register('text', Text);

  // Freeze all registries to guarantee reproducible renders.
  components.freeze();
  layouts.freeze();
  skins.freeze();
  typography.freeze();

  return { components, layouts, skins, typography, reactComponents };
}
