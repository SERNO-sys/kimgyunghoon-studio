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

/**
 * AWIE V2 - Concrete Mock Recipe: Counseling Center.
 *
 * A reusable blueprint for the Counseling industry. It maps the counseling
 * profile's capabilities/requirements (consultation form, portfolio, address,
 * contact form, team profile) to semantic features. The `gallery` feature
 * expresses the `discovery` capability that the Brain Decision Engine fires
 * for a counseling business, so a counseling input no longer fails with
 * NO_COMPATIBLE_RECIPE.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure presentation data.
 */
export const COUNSELING_CENTER_RECIPE: RecipeBlueprint = {
  recipeId: 'counseling-center',
  supportedIndustries: ['counseling'],
  strategy: {
    intent: ['authority', 'conversion'],
    cta: {
      primaryLabel: '상담 예약하기',

      primaryTarget: '/contact',
      secondaryLabel: '상담사 소개',
      secondaryTarget: '/about',
    },
    hero: {
      layout: 'centered',
      headline: '마음의 안정을 찾는 여정을 함께합니다',
      subheadline: '전문 심리상담사가 당신의 이야기를 경청합니다.',
    },
  },
  content: {
    pages: [
      {
        id: 'home',
        route: '/',
        title: 'Home',
        isHome: true,
        sectionIds: ['hero', 'about', 'team', 'gallery', 'contact'],
      },
      {
        id: 'about',
        route: '/about',
        title: 'About',
        sectionIds: ['about', 'team'],
      },
    ],
    sections: [
      {
        id: 'hero',
        type: 'hero',
        layout: 'centered',
        content: {
          headline: '마음의 안정을 찾는 여정을 함께합니다',
          subheadline: '전문 심리상담사가 당신의 이야기를 경청합니다.',
        },
        assetIds: ['hero-bg'],
      },
      {
        id: 'about',
        type: 'text',
        layout: 'centered',
        content: {
          body: '신뢰와 공감을 바탕으로 한 전문 심리상담 서비스.',
        },
      },
      {
        id: 'team',
        type: 'features',
        layout: 'grid',
        content: {
          heading: '상담사 소개',
        },
      },
      {
        id: 'gallery',
        type: 'gallery',
        layout: 'grid',
        content: {
          heading: '센터 소개',
        },
      },
      {
        id: 'contact',
        type: 'contact',
        layout: 'split',
        content: {
          heading: '상담 문의',
        },
        formId: 'consultation',
      },
    ],
    defaultContent: {
      title: '심리상담센터',
      tagline: '전문 심리상담 서비스',
      description: '전문 심리상담사가 제공하는 신뢰 기반의 심리상담 서비스.',
      locale: 'ko',
    },
  },
  presentation: {
    preferredLayout: {
      headerType: 'sticky',
      footerType: 'minimal',
      maxWidth: 'lg',
    },
    preferredSkin: {
      colorPalette: '#4C6B8A',
      fontPairing: 'sans',
      buttonStyle: 'rounded',
    },
    preferredSkeleton: {
      headerType: 'sticky',
      heroType: 'centered',
    },
    preferredTypography: {
      fontPairing: 'sans',
      baseSize: 'md',
      headingWeight: '600',
    },
  },
  assets: {
    assets: [
      {
        id: 'hero-bg',
        url: '/images/counseling-hero.jpg',
        mimeType: 'image/jpeg',
        alt: 'A calm, welcoming counseling center space',
      },
    ],
  },
  mapping: {
    capabilityFeatures: [
      { capability: 'supportsConsultationForm', feature: Feature.Contact },
      { capability: 'supportsPortfolio', feature: Feature.Gallery },
      { capability: 'requiresAddress', feature: Feature.Address },
      { capability: 'requiresContactForm', feature: Feature.Contact },
      { capability: 'requiresTeamProfile', feature: Feature.Team },
      { capability: 'requiresTeamProfile', feature: Feature.Testimonials },
    ],
    sectionMappings: [
      {
        feature: Feature.Gallery,
        sectionType: 'gallery',
        layout: 'grid',
        page: 'home',
        order: 3,
        required: false,
      },
      {
        feature: Feature.Team,
        sectionType: 'features',
        layout: 'grid',
        page: 'home',
        order: 2,
        required: true,
      },
      {
        feature: Feature.Testimonials,
        sectionType: 'testimonials',
        layout: 'grid',
        page: 'home',
        order: 6,
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

/**
 * AWIE V2 - Generic Professional Recipe.
 *
 * The industry-agnostic fallback RecipeBlueprint for the unresolved/generic
 * industry profile (industryId "generic"). It is the ONLY recipe that declares
 * support for the "generic" industry, so the RecipeIntegration industry safety
 * boundary can never select a mismatched industry-specific recipe (e.g.
 * modern-bistro) for an unknown business type.
 *
 * It expresses exactly the two capabilities the Brain Decision Engine fires
 * for a generic profile:
 *   - discovery (ACTIVE)  → Feature.Gallery  (never a menu — no product records)
 *   - inquiry  (ACTIVE)   → Feature.Contact
 *
 * All copy is deliberately neutral and industry-agnostic so it is safe for any
 * unknown business type (photographer, consultant, creator, etc.). It contains
 * NO industry-specific sample content.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure presentation data.
 */
export const GENERIC_PROFESSIONAL_RECIPE: RecipeBlueprint = {
  recipeId: 'generic-professional',
  supportedIndustries: ['generic'],
  strategy: {
    intent: ['conversion'],
    cta: {
      primaryLabel: '문의하기',
      primaryTarget: '/contact',
      secondaryLabel: '소개 보기',
      secondaryTarget: '/about',
    },
    hero: {
      layout: 'centered',
      headline: '우리 브랜드를 소개합니다',
      subheadline: '고객에게 신뢰와 가치를 전하는 전문 서비스.',
    },
  },
  content: {
    pages: [
      {
        id: 'home',
        route: '/',
        title: 'Home',
        isHome: true,
        sectionIds: ['hero', 'about', 'gallery', 'contact'],
      },
      {
        id: 'about',
        route: '/about',
        title: 'About',
        sectionIds: ['about'],
      },
    ],
    sections: [
      {
        id: 'hero',
        type: 'hero',
        layout: 'centered',
        content: {
          headline: '우리 브랜드를 소개합니다',
          subheadline: '고객에게 신뢰와 가치를 전하는 전문 서비스.',
        },
        assetIds: ['hero-bg'],
      },
      {
        id: 'about',
        type: 'text',
        layout: 'centered',
        content: {
          body: '고객의 니즈를 이해하고 최상의 가치를 제공합니다.',
        },
      },
      {
        id: 'gallery',
        type: 'gallery',
        layout: 'grid',
        content: {
          heading: '작업 소개',
        },
      },
      {
        id: 'contact',
        type: 'contact',
        layout: 'split',
        content: {
          heading: '문의하기',
        },
        formId: 'contact',
      },
    ],
    defaultContent: {
      title: '우리 브랜드',
      tagline: '전문적인 서비스를 제공합니다',
      description: '고객에게 신뢰와 가치를 전하는 전문 서비스 브랜드입니다.',
      locale: 'ko',
    },
  },
  presentation: {
    preferredLayout: {
      headerType: 'sticky',
      footerType: 'minimal',
      maxWidth: 'lg',
    },
    preferredSkin: {
      colorPalette: '#334155',
      fontPairing: 'sans',
      buttonStyle: 'rounded',
    },
    preferredSkeleton: {
      headerType: 'sticky',
      heroType: 'centered',
    },
    preferredTypography: {
      fontPairing: 'sans',
      baseSize: 'md',
      headingWeight: '600',
    },
  },
  assets: {
    assets: [
      {
        id: 'hero-bg',
        url: '/images/generic-hero.jpg',
        mimeType: 'image/jpeg',
        alt: 'A professional, welcoming brand hero image',
      },
    ],
  },
  mapping: {
    capabilityFeatures: [
      { capability: 'supportsPortfolio', feature: Feature.Gallery },
      { capability: 'supportsPortfolio', feature: Feature.Hero },
      { capability: 'requiresContactForm', feature: Feature.Contact },
    ],
    sectionMappings: [
      {
        feature: Feature.Hero,
        sectionType: 'hero',
        layout: 'centered',
        page: 'home',
        order: 0,
        required: false,
      },
      {
        feature: Feature.Gallery,
        sectionType: 'gallery',
        layout: 'grid',
        page: 'home',
        order: 2,
        required: false,
      },
      {
        feature: Feature.Contact,
        sectionType: 'contact',
        layout: 'split',
        page: 'home',
        order: 3,
        required: true,
      },
    ],
  },
};

/** All mock recipes, for convenience. */
export const MOCK_RECIPES: RecipeBlueprint[] = [
  MODERN_BISTRO_RECIPE,
  COUNSELING_CENTER_RECIPE,
  GENERIC_PROFESSIONAL_RECIPE,
];



