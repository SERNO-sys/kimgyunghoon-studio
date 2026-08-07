/**
 * AWIE V2 - Semantic Presentation Components Barrel (Phase 09B, Mandate 2).
 *
 * Exports the DUMB, semantic React presentation components and their prop
 * contracts. These components know NOTHING about ThemeConfig or SectionConfig.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure presentation infrastructure.
 */

export type { Action, HeroProps, Media, TextProps } from './types';

export { Hero } from './Hero';
export { Text } from './Text';
