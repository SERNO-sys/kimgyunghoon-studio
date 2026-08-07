/**
 * AWIE V2 - Product Development Phase: Reference Products Registry.
 *
 * The canonical registry of the 6 Business Reference Websites built ON TOP of
 * the frozen AWIE V2 Engine. Each product is a complete ThemeConfig (the SSOT)
 * that the frozen Golden Path renders.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   These are PRODUCTS, not the engine. They do NOT modify the frozen engine,
 *   SDK, or CLI. They only declare ThemeConfig data that the frozen Golden Path
 *   renders. They contain NO business logic and NO rendering.
 */

import type { ProductDeclaration } from './shared/scaffold';
import { flowerShopDeclaration } from './flower-shop';
import { lawFirmDeclaration } from './law-firm';
import { restaurantDeclaration } from './restaurant';
import { churchDeclaration } from './church';
import { photographerDeclaration } from './photographer';
import { hospitalDeclaration } from './hospital';

/**
 * The 6 Business Reference Websites.
 *
 * Each entry pairs the product's "One-Line UX" Golden Prompt (the single
 * logical AI input) with its resolved ProductDeclaration (the product brief
 * that the frozen engine turns into a ThemeConfig).
 */
export interface ReferenceProduct {
  /** The product id. */
  readonly id: string;
  /** The product title. */
  readonly title: string;
  /** The industry focus. */
  readonly focus: string;
  /** The "One-Line UX" Golden Prompt that resolves into this product. */
  readonly goldenPrompt: string;
  /** The product declaration (the brief the engine resolves). */
  readonly declaration: ProductDeclaration;
}

/**
 * The registry of all 6 Reference Products.
 */
export const REFERENCE_PRODUCTS: readonly ReferenceProduct[] = [
  {
    id: 'flower-shop',
    title: 'Bloom & Stem',
    focus: 'Visuals, Product Gallery',
    goldenPrompt:
      'Build a flower shop website that feels like walking into a sunlit greenhouse — a full-bleed hero of fresh blooms, a gallery of signature bouquets, a story section about our growers, and a contact form for custom orders.',
    declaration: flowerShopDeclaration,
  },
  {
    id: 'law-firm',
    title: 'Hartwell & Associates',
    focus: 'Trust, Typography, Contact Forms',
    goldenPrompt:
      'Build a law firm website that projects quiet authority — a restrained serif hero with a clear practice-area list, a credentials section that builds trust, and a prominent consultation request form.',
    declaration: lawFirmDeclaration,
  },
  {
    id: 'restaurant',
    title: 'Ember & Oak',
    focus: 'Menu, Location, Reservation UX',
    goldenPrompt:
      'Build a restaurant website that makes you hungry — a warm hero of the signature dish, a full menu section, our location and hours, and a one-tap reservation form.',
    declaration: restaurantDeclaration,
  },
  {
    id: 'church',
    title: 'Grace Community Church',
    focus: 'Community, Audio/Video integration',
    goldenPrompt:
      'Build a church website that feels like a warm welcome — a hero inviting people to join us, a section for this week’s sermon with audio and video, a community events list, and a way to get connected.',
    declaration: churchDeclaration,
  },
  {
    id: 'photographer',
    title: 'Lena Park Photography',
    focus: 'Portfolio, High-res layouts',
    goldenPrompt:
      'Build a photographer’s portfolio that lets the work speak — a full-bleed hero image, a high-resolution gallery of signature shoots, a services section, and a booking inquiry form.',
    declaration: photographerDeclaration,
  },
  {
    id: 'hospital',
    title: 'Mercy General Hospital',
    focus: 'Information architecture, FAQ, Booking',
    goldenPrompt:
      'Build a hospital website that is calm and easy to navigate — a clear hero with a prominent Book an appointment action, a departments overview, a reassuring FAQ, and a simple appointment booking form.',
    declaration: hospitalDeclaration,
  },
];

/**
 * Resolves a Reference Product by id.
 *
 * @param id The product id.
 * @returns The ReferenceProduct, or undefined if not found.
 */
export function getReferenceProduct(id: string): ReferenceProduct | undefined {
  return REFERENCE_PRODUCTS.find((product) => product.id === id);
}
