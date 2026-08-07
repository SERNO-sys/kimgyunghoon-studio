/**
 * AWIE V2 - Product Development Phase: Reference Product 05 — Photographer.
 *
 * Focus: Portfolio, High-res layouts.
 *
 * The "One-Line UX" Golden Prompt that resolves into this ThemeConfig:
 *
 *   "Build a photographer’s portfolio that lets the work speak — a full-bleed
 *    hero image, a high-resolution gallery of signature shoots, a services
 *    section, and a booking inquiry form."
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
 * The Photographer product declaration.
 *
 * A complete, production-ready reference site focused on portfolio and high-res
 * layouts. It declares a home page (hero + portfolio gallery + services +
 * booking), a portfolio page, and a booking page, a flat asset registry, a main
 * navigation menu, and a booking inquiry form.
 */
export const photographerDeclaration: ProductDeclaration = {
  id: 'photographer',
  title: 'Lena Park Photography',
  tagline: 'Moments, beautifully captured.',
  description:
    'Lena Park is an award-winning photographer specializing in weddings, portraits, and editorial work.',
  locale: 'en',
  domain: 'lenapark.example',
  intent: 'brand_experience',
  industry: 'photography',
  reasoning:
    'A photographer’s work is the product. I chose a clean, gallery-like layout with a full-bleed hero and a high-resolution portfolio grid so the imagery dominates and the brand stays minimal.',
  settings: {
    primaryColor: '#111111',
    secondaryColor: '#b08d57',
    backgroundColor: '#ffffff',
    textColor: '#1a1a1a',
    font: 'sans',
    spacing: 'lg',
    radius: 'none',
    skin: { colorPalette: 'mono', fontPairing: 'sans', buttonStyle: 'sharp' },
    skeleton: { headerType: 'top', heroType: 'full-bleed' },
  },
  pages: [
    {
      id: 'home',
      route: '/',
      title: 'Lena Park Photography — Moments, Beautifully Captured',
      description: 'Weddings, portraits, and editorial photography.',
      isHome: true,
      sections: [
        {
          id: 'hero',
          type: 'hero',
          content: {
            heading: 'Moments, beautifully captured.',
            subheading: 'Weddings, portraits, and editorial work by Lena Park.',
            media: 'hero-portrait',
            mediaAlt: 'A striking portrait photograph',
            actions: [
              { label: 'View portfolio', target: '/portfolio', variant: 'primary' },
              { label: 'Book a session', target: '/booking' },
            ],
          },
          assetIds: ['hero-portrait'],
        },
        {
          id: 'portfolio',
          type: 'gallery',
          content: {
            heading: 'Selected Work',
            body: 'A glimpse of recent shoots.',
            items: [
              { title: 'Wedding — The Mill', media: 'work-wedding' },
              { title: 'Portrait — Studio', media: 'work-portrait' },
              { title: 'Editorial — Vogue', media: 'work-editorial' },
              { title: 'Family — Golden Hour', media: 'work-family' },
            ],
          },
          assetIds: ['work-wedding', 'work-portrait', 'work-editorial', 'work-family'],
        },
        {
          id: 'services',
          type: 'features',
          content: {
            heading: 'Services',
            body: 'Tailored sessions for every occasion.',
            items: [
              { title: 'Weddings', body: 'Full-day coverage, two photographers.' },
              { title: 'Portraits', body: 'Studio or location, 90 minutes.' },
              { title: 'Editorial', body: 'Magazine and brand campaigns.' },
              { title: 'Family', body: 'Relaxed, candid sessions.' },
            ],
          },
        },
        {
          id: 'booking',
          type: 'contact',
          content: {
            heading: 'Book a Session',
            body: 'Tell me about your shoot and I will get back to you within 24 hours.',
          },
          formId: 'booking',
        },
      ],
    },
    {
      id: 'portfolio',
      route: '/portfolio',
      title: 'Portfolio — Lena Park Photography',
      description: 'Selected work from recent shoots.',
      sections: [
        {
          id: 'portfolio-hero',
          type: 'hero',
          content: {
            heading: 'Portfolio',
            subheading: 'A curated selection of recent work.',
            actions: [{ label: 'Book a session', target: '/booking', variant: 'primary' }],
          },
        },
        {
          id: 'portfolio-grid',
          type: 'gallery',
          content: {
            heading: 'Recent Shoots',
            body: 'Weddings, portraits, and editorial.',
            items: [
              { title: 'Wedding — The Mill', media: 'work-wedding' },
              { title: 'Portrait — Studio', media: 'work-portrait' },
              { title: 'Editorial — Vogue', media: 'work-editorial' },
              { title: 'Family — Golden Hour', media: 'work-family' },
              { title: 'Wedding — Lakeside', media: 'work-lakeside' },
              { title: 'Portrait — Urban', media: 'work-urban' },
            ],
          },
          assetIds: ['work-wedding', 'work-portrait', 'work-editorial', 'work-family', 'work-lakeside', 'work-urban'],
        },
      ],
    },
    {
      id: 'booking',
      route: '/booking',
      title: 'Book a Session — Lena Park Photography',
      description: 'Inquire about booking a photography session.',
      sections: [
        {
          id: 'booking-hero',
          type: 'hero',
          content: {
            heading: 'Book a Session',
            subheading: 'Let’s create something beautiful together.',
          },
        },
        {
          id: 'booking-form',
          type: 'contact',
          content: {
            heading: 'Session Inquiry',
            body: 'Share the details and I will respond within 24 hours.',
          },
          formId: 'booking',
        },
      ],
    },
  ],
  assets: [
    { id: 'hero-portrait', url: '/images/photographer/hero-portrait.jpg', mimeType: 'image/jpeg', width: 2000, height: 1200, alt: 'A striking portrait photograph' },
    { id: 'work-wedding', url: '/images/photographer/work-wedding.jpg', mimeType: 'image/jpeg', width: 1600, height: 1200, alt: 'A wedding photograph' },
    { id: 'work-portrait', url: '/images/photographer/work-portrait.jpg', mimeType: 'image/jpeg', width: 1200, height: 1600, alt: 'A studio portrait' },
    { id: 'work-editorial', url: '/images/photographer/work-editorial.jpg', mimeType: 'image/jpeg', width: 1600, height: 1200, alt: 'An editorial photograph' },
    { id: 'work-family', url: '/images/photographer/work-family.jpg', mimeType: 'image/jpeg', width: 1600, height: 1200, alt: 'A family photograph at golden hour' },
    { id: 'work-lakeside', url: '/images/photographer/work-lakeside.jpg', mimeType: 'image/jpeg', width: 1600, height: 1200, alt: 'A lakeside wedding photograph' },
    { id: 'work-urban', url: '/images/photographer/work-urban.jpg', mimeType: 'image/jpeg', width: 1200, height: 1600, alt: 'An urban portrait' },
  ],
  menus: [
    {
      id: 'main',
      label: 'Main',
      items: [
        { label: 'Home', target: '/' },
        { label: 'Portfolio', target: '/portfolio' },
        { label: 'Booking', target: '/booking' },
      ],
    },
  ],
  forms: [
    {
      id: 'booking',
      title: 'Session Inquiry',
      submitTo: '/api/bookings',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Jane Doe' },
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'jane@example.com' },
        { name: 'type', label: 'Session type', type: 'select', options: ['Wedding', 'Portrait', 'Editorial', 'Family'] },
        { name: 'date', label: 'Preferred date', type: 'text', placeholder: 'MM/DD/YYYY' },
        { name: 'message', label: 'Tell me about your shoot', type: 'textarea', placeholder: 'Location, style, inspiration...' },
      ],
    },
  ],
};
