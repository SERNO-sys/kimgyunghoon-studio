/**
 * AWIE V2 - Product Development Phase: Reference Product 01 — Flower Shop.
 *
 * Focus: Visuals, Product Gallery.
 *
 * The "One-Line UX" Golden Prompt that resolves into this ThemeConfig:
 *
 *   "Build a flower shop website that feels like walking into a sunlit
 *    greenhouse — a full-bleed hero of fresh blooms, a gallery of signature
 *    bouquets, a story section about our growers, and a contact form for
 *    custom orders."
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
 * The Flower Shop product declaration.
 *
 * A complete, production-ready reference site focused on visuals and a product
 * gallery. It declares a home page (hero + gallery + story + contact) and an
 * about page, a flat asset registry of bouquet imagery, a main navigation menu,
 * and a custom-order contact form.
 */
export const flowerShopDeclaration: ProductDeclaration = {
  id: 'flower-shop',
  title: 'Bloom & Stem',
  tagline: 'Fresh flowers, thoughtfully arranged.',
  description:
    'Bloom & Stem is a boutique flower shop crafting seasonal bouquets and custom arrangements for every occasion.',
  locale: 'en',
  domain: 'bloomandstem.example',
  intent: 'commerce',
  industry: 'florist',
  reasoning:
    'A florist needs visual warmth and product showcase. I chose a soft, sunlit palette, a full-bleed hero, and a prominent gallery so the product is the hero.',
  settings: {
    primaryColor: '#e8a0b4',
    secondaryColor: '#7c9a6d',
    backgroundColor: '#fffaf5',
    textColor: '#3a2e2a',
    font: 'serif',
    spacing: 'md',
    radius: 'lg',
    skin: { colorPalette: 'bloom', fontPairing: 'serif', buttonStyle: 'rounded' },
    skeleton: { headerType: 'centered', heroType: 'full-bleed' },
  },
  pages: [
    {
      id: 'home',
      route: '/',
      title: 'Bloom & Stem — Fresh Flowers',
      description: 'Seasonal bouquets and custom arrangements.',
      isHome: true,
      sections: [
        {
          id: 'hero',
          type: 'hero',
          content: {
            heading: 'Fresh flowers, thoughtfully arranged.',
            subheading:
              'Seasonal bouquets and custom arrangements, hand-tied by our growers every morning.',
            media: 'hero-bouquet',
            mediaAlt: 'A sunlit bouquet of fresh seasonal flowers',
            actions: [
              { label: 'Shop bouquets', target: '/gallery', variant: 'primary' },
              { label: 'Custom order', target: '/contact' },
            ],
          },
          assetIds: ['hero-bouquet'],
        },
        {
          id: 'gallery',
          type: 'gallery',
          content: {
            heading: 'Signature Bouquets',
            body: 'Our most-loved arrangements, ready to gift or enjoy.',
            items: [
              { title: 'Sunrise Peony', price: '$48', media: 'bouquet-peony' },
              { title: 'Wild Meadow', price: '$42', media: 'bouquet-meadow' },
              { title: 'Rose Romance', price: '$55', media: 'bouquet-rose' },
              { title: 'Lavender Calm', price: '$38', media: 'bouquet-lavender' },
            ],
          },
          assetIds: ['bouquet-peony', 'bouquet-meadow', 'bouquet-rose', 'bouquet-lavender'],
        },
        {
          id: 'story',
          type: 'text',
          content: {
            heading: 'Our Story',
            body: 'We are a family of growers who believe flowers should be fresh, local, and honest. Every stem is cut at dawn and arranged by hand.',
          },
        },
        {
          id: 'contact',
          type: 'contact',
          content: {
            heading: 'Custom Orders',
            body: 'Tell us about your occasion and we will craft something unforgettable.',
          },
          formId: 'custom-order',
        },
      ],
    },
    {
      id: 'about',
      route: '/about',
      title: 'About Bloom & Stem',
      description: 'Meet the growers behind Bloom & Stem.',
      sections: [
        {
          id: 'about-hero',
          type: 'hero',
          content: {
            heading: 'Grown with care.',
            subheading: 'Meet the family behind every bouquet.',
            media: 'grower-field',
            mediaAlt: 'A grower tending a field of flowers',
            actions: [{ label: 'Visit us', target: '/contact' }],
          },
          assetIds: ['grower-field'],
        },
        {
          id: 'about-text',
          type: 'text',
          content: {
            heading: 'Our Philosophy',
            body: 'We grow what we sell. No middlemen, no cold storage — just flowers that arrive as fresh as the morning they were cut.',
          },
        },
      ],
    },
  ],
  assets: [
    { id: 'hero-bouquet', url: '/images/flower-shop/hero-bouquet.jpg', mimeType: 'image/jpeg', width: 1600, height: 900, alt: 'A sunlit bouquet of fresh seasonal flowers' },
    { id: 'bouquet-peony', url: '/images/flower-shop/bouquet-peony.jpg', mimeType: 'image/jpeg', width: 800, height: 800, alt: 'A peony bouquet' },
    { id: 'bouquet-meadow', url: '/images/flower-shop/bouquet-meadow.jpg', mimeType: 'image/jpeg', width: 800, height: 800, alt: 'A wild meadow bouquet' },
    { id: 'bouquet-rose', url: '/images/flower-shop/bouquet-rose.jpg', mimeType: 'image/jpeg', width: 800, height: 800, alt: 'A rose bouquet' },
    { id: 'bouquet-lavender', url: '/images/flower-shop/bouquet-lavender.jpg', mimeType: 'image/jpeg', width: 800, height: 800, alt: 'A lavender bouquet' },
    { id: 'grower-field', url: '/images/flower-shop/grower-field.jpg', mimeType: 'image/jpeg', width: 1600, height: 900, alt: 'A grower tending a field of flowers' },
  ],
  menus: [
    {
      id: 'main',
      label: 'Main',
      items: [
        { label: 'Home', target: '/' },
        { label: 'Gallery', target: '/gallery' },
        { label: 'About', target: '/about' },
        { label: 'Contact', target: '/contact' },
      ],
    },
  ],
  forms: [
    {
      id: 'custom-order',
      title: 'Custom Order',
      submitTo: '/api/orders',
      fields: [
        { name: 'name', label: 'Your name', type: 'text', required: true, placeholder: 'Jane Doe' },
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'jane@example.com' },
        { name: 'occasion', label: 'Occasion', type: 'select', options: ['Wedding', 'Birthday', 'Sympathy', 'Just because'] },
        { name: 'budget', label: 'Budget', type: 'select', options: ['Under $50', '$50–$100', '$100+'] },
        { name: 'message', label: 'Tell us more', type: 'textarea', placeholder: 'Colors, flowers, delivery date...' },
      ],
    },
  ],
};
