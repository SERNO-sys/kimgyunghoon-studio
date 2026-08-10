/**
 * AWIE V2 - Concrete Mock Industry Profiles.
 *
 * These are DESIGN-ONLY mock profiles. They describe what the business
 * REQUIRES and SUPPORTS — never how the website should look.
 *
 * STRICT BAN: No layout, skin, skeleton, typography, or heroStyle fields.
 */

import type { IndustryProfile } from './types';

/** The Restaurant profile. */
export const RESTAURANT_PROFILE: IndustryProfile = {
  industryId: 'restaurant',
  aliases: ['restaurant', 'diner', 'bistro', 'eatery', 'cafe', 'coffee shop'],
  intent: {
    primary: 'sell_food',
    secondary: ['attract_diners', 'take_reservations'],
  },
  capabilities: {
    supportsMenu: true,
    supportsReservation: true,
    supportsOnlineOrdering: true,
  },
  requirements: {
    requiresAddress: true,
    requiresOpeningHours: true,
    requiresContactForm: true,
  },
  constraints: {
    requiresPhysicalLocation: true,
    localOnly: true,
  },
  validationProfile: {
    requiredFields: ['businessType', 'services', 'contactPreference'],
    forbiddenFields: [],
  },
  confidenceHints: {
    prioritySlots: ['businessType', 'services', 'contactPreference'],
    suggestedQuestions: {
      businessType: ['What type of food do you serve?'],
      services: ['What are your signature dishes?'],
      contactPreference: ['How should customers reach you?'],
    },
  },
  metadata: {
    version: 1,
    updatedAt: '2026-08-05T00:00:00.000Z',
    source: 'mock',
  },
};

/** The Law Firm profile. */
export const LAW_FIRM_PROFILE: IndustryProfile = {
  industryId: 'law_firm',
  aliases: ['law firm', 'lawyer', 'attorney', 'legal practice', 'law office'],
  intent: {
    primary: 'attract_clients',
    secondary: ['build_trust', 'show_expertise'],
  },
  capabilities: {
    supportsConsultationForm: true,
    supportsPortfolio: true,
  },
  requirements: {
    requiresAddress: true,
    requiresContactForm: true,
    requiresDisclaimer: true,
    requiresTeamProfile: true,
  },
  constraints: {
    localOnly: true,
  },
  validationProfile: {
    requiredFields: ['businessType', 'services', 'contactPreference'],
    forbiddenFields: [],
  },
  confidenceHints: {
    prioritySlots: ['businessType', 'services', 'contactPreference'],
    suggestedQuestions: {
      businessType: ['What area of law do you practice?'],
      services: ['What legal services do you offer?'],
      contactPreference: ['How should clients reach you?'],
    },
  },
  metadata: {
    version: 1,
    updatedAt: '2026-08-05T00:00:00.000Z',
    source: 'mock',
  },
};

/**
 * The Counseling / Mental Health profile.
 *
 * This profile exists so that a counseling business (e.g. a Korean
 * 심리상담센터) resolves to a dedicated industry instead of silently falling
 * back to the generic profile. It includes both English and Korean aliases.
 * The Korean aliases are the common ways a user describes this business in a
 * one-line prompt (상담, 심리상담, 상담센터, 심리상담센터, 카운슬링).
 */
export const COUNSELING_PROFILE: IndustryProfile = {
  industryId: 'counseling',
  aliases: [
    'counseling',
    'counselor',
    'counselling',
    'therapy',
    'therapist',
    'mental health',
    'psychology',
    'psychologist',
    '상담',
    '심리상담',
    '상담센터',
    '심리상담센터',
    '카운슬링',
    '심리치료',
  ],
  intent: {
    primary: 'attract_clients',
    secondary: ['build_trust', 'show_expertise'],
  },
  capabilities: {
    supportsConsultationForm: true,
    supportsPortfolio: true,
  },
  requirements: {
    requiresAddress: true,
    requiresContactForm: true,
    requiresTeamProfile: true,
  },
  constraints: {
    localOnly: true,
  },
  validationProfile: {
    requiredFields: ['businessType', 'services', 'contactPreference'],
    forbiddenFields: [],
  },
  confidenceHints: {
    prioritySlots: ['businessType', 'services', 'contactPreference'],
    suggestedQuestions: {
      businessType: ['What type of counseling do you provide?'],
      services: ['What counseling services do you offer?'],
      contactPreference: ['How should clients reach you?'],
    },
  },
  metadata: {
    version: 1,
    updatedAt: '2026-08-05T00:00:00.000Z',
    source: 'mock',
  },
};

/** The Generic / Unknown fallback profile. */
export const GENERIC_PROFILE: IndustryProfile = {
  industryId: 'generic',
  aliases: ['generic', 'unknown', 'business'],
  intent: {
    primary: 'establish_presence',
    secondary: [],
  },
  capabilities: {},
  requirements: {
    requiresContactForm: true,
  },
  constraints: {},
  validationProfile: {
    requiredFields: ['businessType'],
    forbiddenFields: [],
  },
  confidenceHints: {
    prioritySlots: ['businessType', 'services'],
    suggestedQuestions: {
      businessType: ['What does your business do?'],
      services: ['What products or services do you offer?'],
    },
  },
  metadata: {
    version: 1,
    updatedAt: '2026-08-05T00:00:00.000Z',
    source: 'mock',
  },
};

/** All mock profiles, for convenience. */
export const MOCK_INDUSTRY_PROFILES: IndustryProfile[] = [
  RESTAURANT_PROFILE,
  LAW_FIRM_PROFILE,
  COUNSELING_PROFILE,
  GENERIC_PROFILE,
];
