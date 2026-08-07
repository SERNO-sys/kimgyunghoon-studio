/**
 * AWIE V2 - Product Development Phase: Reference Product 02 — Law Firm.
 *
 * Focus: Trust, Typography, Contact Forms.
 *
 * The "One-Line UX" Golden Prompt that resolves into this ThemeConfig:
 *
 *   "Build a law firm website that projects quiet authority — a restrained
 *    serif hero with a clear practice-area list, a credentials section that
 *    builds trust, and a prominent consultation request form."
 *
 * This declaration is the PRODUCT BRIEF. The frozen AWIE V2 Engine resolves it
 * into the complete ThemeConfig (the SSOT) below via the product scaffold.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   This is a PRODUCT, not the engine. It does NOT modify the frozen engine,
 *   SDK, or CLI. It only declares ThemeConfig data that the frozen Golden Path
 *   renders. It contains NO business logic and NO rendering.
 */

import type { ProductDeclaration } from '../shared/scaffold';

/**
 * The Law Firm product declaration.
 *
 * A complete, production-ready reference site focused on trust, typography, and
 * contact forms. It declares a home page (hero + practice areas + credentials +
 * consultation form), an about page, and a contact page, a flat asset registry,
 * a main navigation menu, and a consultation request form.
 */
export const lawFirmDeclaration: ProductDeclaration = {
  id: 'law-firm',
  title: 'Hartwell & Associates',
  tagline: 'Counsel you can trust.',
  description:
    'Hartwell & Associates is a full-service law firm providing trusted counsel in corporate, family, and real estate law.',
  locale: 'en',
  domain: 'hartwelllaw.example',
  intent: 'authority',
  industry: 'legal',
  reasoning:
    'A law firm must project trust and authority. I chose a restrained navy palette, a serif typeface, a credentials section, and a prominent consultation form to convert visitors into clients.',
  settings: {
    primaryColor: '#1f3a5f',
    secondaryColor: '#b08d57',
    backgroundColor: '#faf9f7',
    textColor: '#1c1c1c',
    font: 'serif',
    spacing: 'lg',
    radius: 'sm',
    skin: { colorPalette: 'navy', fontPairing: 'serif', buttonStyle: 'sharp' },
    skeleton: { headerType: 'top', heroType: 'split' },
  },
  pages: [
    {
      id: 'home',
      route: '/',
      title: 'Hartwell & Associates — Trusted Counsel',
      description: 'Full-service legal counsel in corporate, family, and real estate law.',
      isHome: true,
      sections: [
        {
          id: 'hero',
          type: 'hero',
          content: {
            heading: 'Counsel you can trust.',
            subheading:
              'For over 30 years, Hartwell & Associates has guided families and businesses through their most important decisions.',
            media: 'office',
            mediaAlt: 'The Hartwell & Associates office',
            actions: [
              { label: 'Request a consultation', target: '/contact', variant: 'primary' },
              { label: 'Our practice areas', target: '/practice' },
            ],
          },
          assetIds: ['office'],
        },
        {
          id: 'practice',
          type: 'features',
          content: {
            heading: 'Practice Areas',
            body: 'Focused counsel across the matters that matter most.',
            items: [
              { title: 'Corporate Law', body: 'Formation, governance, and transactions.' },
              { title: 'Family Law', body: 'Divorce, custody, and mediation.' },
              { title: 'Real Estate', body: 'Purchases, leases, and disputes.' },
              { title: 'Estate Planning', body: 'Wills, trusts, and probate.' },
            ],
          },
        },
        {
          id: 'credentials',
          type: 'text',
          content: {
            heading: 'A record of results.',
            body: 'Recognized by the State Bar, ranked in the top tier of our region, and trusted by over 2,000 clients.',
          },
        },
        {
          id: 'consult',
          type: 'contact',
          content: {
            heading: 'Request a Consultation',
            body: 'Tell us about your matter and we will respond within one business day.',
          },
          formId: 'consultation',
        },
      ],
    },
    {
      id: 'about',
      route: '/about',
      title: 'About Hartwell & Associates',
      description: 'Meet the partners behind Hartwell & Associates.',
      sections: [
        {
          id: 'about-hero',
          type: 'hero',
          content: {
            heading: 'A firm built on trust.',
            subheading: 'Meet the partners who lead our practice.',
            media: 'partners',
            mediaAlt: 'The Hartwell & Associates partners',
            actions: [{ label: 'Meet the team', target: '/team' }],
          },
          assetIds: ['partners'],
        },
        {
          id: 'about-text',
          type: 'text',
          content: {
            heading: 'Our Commitment',
            body: 'We believe the best counsel is honest, direct, and always in your corner. That is the standard we hold ourselves to, every case.',
          },
        },
      ],
    },
    {
      id: 'contact',
      route: '/contact',
      title: 'Contact Hartwell & Associates',
      description: 'Request a consultation with our team.',
      sections: [
        {
          id: 'contact-hero',
          type: 'hero',
          content: {
            heading: 'Let’s talk.',
            subheading: 'Reach out for a confidential consultation.',
            actions: [{ label: 'Call us', target: 'tel:+15550100' }],
          },
        },
        {
          id: 'contact-form',
          type: 'contact',
          content: {
            heading: 'Request a Consultation',
            body: 'All inquiries are confidential.',
          },
          formId: 'consultation',
        },
      ],
    },
  ],
  assets: [
    { id: 'office', url: '/images/law-firm/office.jpg', mimeType: 'image/jpeg', width: 1600, height: 900, alt: 'The Hartwell & Associates office' },
    { id: 'partners', url: '/images/law-firm/partners.jpg', mimeType: 'image/jpeg', width: 1600, height: 900, alt: 'The Hartwell & Associates partners' },
  ],
  menus: [
    {
      id: 'main',
      label: 'Main',
      items: [
        { label: 'Home', target: '/' },
        { label: 'Practice Areas', target: '/practice' },
        { label: 'About', target: '/about' },
        { label: 'Contact', target: '/contact' },
      ],
    },
  ],
  forms: [
    {
      id: 'consultation',
      title: 'Consultation Request',
      submitTo: '/api/consultations',
      fields: [
        { name: 'name', label: 'Full name', type: 'text', required: true, placeholder: 'Jane Doe' },
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'jane@example.com' },
        { name: 'phone', label: 'Phone', type: 'tel', placeholder: '(555) 010-0100' },
        { name: 'practice', label: 'Practice area', type: 'select', options: ['Corporate', 'Family', 'Real Estate', 'Estate Planning'] },
        { name: 'message', label: 'Describe your matter', type: 'textarea', required: true, placeholder: 'Briefly describe your legal matter...' },
      ],
    },
  ],
};
