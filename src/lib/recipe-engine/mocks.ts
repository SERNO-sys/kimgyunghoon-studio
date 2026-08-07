/**
 * AWIE V2 - Concrete Mock Recipe: Modern Bistro.
 *
 * A rich, reusable blueprint for the Restaurant industry. It maps the
 * supportsMenu capability to the "menu" semantic feature, uses a dark skin,
 * and elegant typography.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure presentation data.
 */

import { Feature, type RecipeBlueprint } from './types';


/** The Modern Bistro recipe. */
export const MODERN_BISTRO_RECIPE: RecipeBlueprint = {
  recipeId: 'modern-bistro',
  supportedIndustries: ['restaurant'],
  strategy: {
    intent: ['conversion', 'brand_experience'],
    cta: {
      primaryLabel: 'Reserve a Table',
      primaryTarget: '/contact',
      secondaryLabel: 'View Menu',
      secondaryTarget: '/menu',
    },
    hero: {
      layout: 'split',
      headline: 'Modern Bistro',
      subheadline: 'Seasonal plates, crafted with care.',
    },
  },
  content: {
    pages: [
      {
        id: 'home',
        route: '/',
        title: 'Home',
        isHome: true,
        sectionIds: ['hero', 'menu', 'about', 'hours', 'contact'],
      },
      {
        id: 'menu',
        route: '/menu',
        title: 'Menu',
        sectionIds: ['menu'],
      },
    ],
    sections: [
      {
        id: 'hero',
        type: 'hero',
        layout: 'split',
        content: {
          headline: 'Modern Bistro',
          subheadline: 'Seasonal plates, crafted with care.',
        },
        assetIds: ['hero-bg'],
      },
      {
        id: 'about',
        type: 'text',
        layout: 'centered',
        content: {
          body: 'A neighborhood bistro celebrating local ingredients.',
        },
      },
      {
        id: 'hours',
        type: 'text',
        layout: 'two-column',
        content: {
          heading: 'Opening Hours',
        },
      },
      {
        id: 'contact',
        type: 'contact',
        layout: 'split',
        content: {
          heading: 'Reserve a Table',
        },
        formId: 'reservation',
      },
    ],
    defaultContent: {
      title: 'Modern Bistro',
      tagline: 'Seasonal plates, crafted with care.',
      description: 'A neighborhood bistro serving seasonal, locally-sourced plates.',
      locale: 'en',
    },
  },
  presentation: {
    preferredLayout: {
      headerType: 'sticky',
      footerType: 'minimal',
      maxWidth: 'lg',
    },
    preferredSkin: {
      colorPalette: '#111827',
      fontPairing: 'serif',
      buttonStyle: 'rounded',
    },
    preferredSkeleton: {
      headerType: 'sticky',
      heroType: 'split',
    },
    preferredTypography: {
      fontPairing: 'serif',
      baseSize: 'md',
      headingWeight: '600',
    },
  },
  assets: {
    assets: [
      {
        id: 'hero-bg',
        url: '/images/bistro-hero.jpg',
        mimeType: 'image/jpeg',
        alt: 'A beautifully plated dish at Modern Bistro',
      },
    ],
  },
  mapping: {
    capabilityFeatures: [
      { capability: 'supportsMenu', feature: Feature.Menu },
      { capability: 'supportsReservation', feature: Feature.Reservation },
      { capability: 'requiresAddress', feature: Feature.Address },
      { capability: 'requiresOpeningHours', feature: Feature.Hours },
      { capability: 'requiresContactForm', feature: Feature.Contact },
    ],
    sectionMappings: [
      {
        feature: Feature.Menu,
        sectionType: 'features',
        layout: 'menu-grid',
        page: 'home',
        order: 2,
        required: false,
      },
      {
        feature: Feature.Reservation,
        sectionType: 'contact',
        layout: 'split',
        page: 'home',
        order: 5,
        required: false,
      },
      {
        feature: Feature.Address,
        sectionType: 'text',
        layout: 'two-column',
        page: 'home',
        order: 4,
        required: true,
      },
      {
        feature: Feature.Hours,
        sectionType: 'text',
        layout: 'two-column',
        page: 'home',
        order: 3,
        required: true,
      },
      {
        feature: Feature.Contact,
        sectionType: 'contact',
        layout: 'split',
        page: 'home',
        order: 5,
        required: true,
      },
    ],

  },
};

/** All mock recipes, for convenience. */
export const MOCK_RECIPES: RecipeBlueprint[] = [MODERN_BISTRO_RECIPE];
