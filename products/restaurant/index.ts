/**
 * AWIE V2 - Product Development Phase: Reference Product 03 — Restaurant.
 *
 * Focus: Menu, Location, Reservation UX.
 *
 * The "One-Line UX" Golden Prompt that resolves into this ThemeConfig:
 *
 *   "Build a restaurant website that makes you hungry — a warm hero of the
 *    signature dish, a full menu section, our location and hours, and a
 *    one-tap reservation form."
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
 * The Restaurant product declaration.
 *
 * A complete, production-ready reference site focused on menu, location, and
 * reservation UX. It declares a home page (hero + menu + location + reservation),
 * a menu page, and a reservation page, a flat asset registry, a main navigation
 * menu, and a reservation form.
 */
export const restaurantDeclaration: ProductDeclaration = {
  id: 'restaurant',
  title: 'Ember & Oak',
  tagline: 'Wood-fired, seasonal, unforgettable.',
  description:
    'Ember & Oak is a wood-fired restaurant serving seasonal, locally-sourced dishes in the heart of the city.',
  locale: 'en',
  domain: 'emberandoak.example',
  intent: 'conversion',
  industry: 'restaurant',
  reasoning:
    'A restaurant needs appetite and action. I chose a warm charcoal-and-ember palette, a hero of the signature dish, a clear menu, and a frictionless reservation form to drive bookings.',
  settings: {
    primaryColor: '#c1440e',
    secondaryColor: '#2b2b2b',
    backgroundColor: '#1a1a1a',
    textColor: '#f5efe6',
    font: 'sans',
    spacing: 'md',
    radius: 'md',
    skin: { colorPalette: 'ember', fontPairing: 'sans', buttonStyle: 'rounded' },
    skeleton: { headerType: 'centered', heroType: 'full-bleed' },
  },
  pages: [
    {
      id: 'home',
      route: '/',
      title: 'Ember & Oak — Wood-Fired Restaurant',
      description: 'Seasonal, wood-fired dishes in the heart of the city.',
      isHome: true,
      sections: [
        {
          id: 'hero',
          type: 'hero',
          content: {
            heading: 'Wood-fired, seasonal, unforgettable.',
            subheading: 'A tasting of the season, cooked over live fire.',
            media: 'signature-dish',
            mediaAlt: 'The signature wood-fired dish',
            actions: [
              { label: 'Reserve a table', target: '/reserve', variant: 'primary' },
              { label: 'View the menu', target: '/menu' },
            ],
          },
          assetIds: ['signature-dish'],
        },
        {
          id: 'menu',
          type: 'features',
          content: {
            heading: 'Tonight’s Menu',
            body: 'A rotating menu built around what the market offers today.',
            items: [
              { title: 'Wood-Fired Octopus', body: 'Charred, smoked paprika, lemon.' },
              { title: 'Heritage Pork', body: 'Slow-roasted, apple, sage.' },
              { title: 'Seasonal Risotto', body: 'Wild mushroom, parmesan.' },
              { title: 'Burnt Honey Tart', body: 'Vanilla bean, sea salt.' },
            ],
          },
        },
        {
          id: 'location',
          type: 'text',
          content: {
            heading: 'Find Us',
            body: '128 Market Street, Downtown. Open Tuesday–Sunday, 5pm–11pm. Walk-ins welcome at the bar.',
          },
        },
        {
          id: 'reserve',
          type: 'contact',
          content: {
            heading: 'Reserve a Table',
            body: 'Book your table in under a minute.',
          },
          formId: 'reservation',
        },
      ],
    },
    {
      id: 'menu',
      route: '/menu',
      title: 'Menu — Ember & Oak',
      description: 'Tonight’s wood-fired menu.',
      sections: [
        {
          id: 'menu-hero',
          type: 'hero',
          content: {
            heading: 'Tonight’s Menu',
            subheading: 'Seasonal, wood-fired, and always changing.',
            actions: [{ label: 'Reserve a table', target: '/reserve', variant: 'primary' }],
          },
        },
        {
          id: 'menu-list',
          type: 'features',
          content: {
            heading: 'From the Fire',
            body: 'Every dish is cooked over live oak.',
            items: [
              { title: 'Wood-Fired Octopus', body: 'Charred, smoked paprika, lemon. $24' },
              { title: 'Heritage Pork', body: 'Slow-roasted, apple, sage. $32' },
              { title: 'Seasonal Risotto', body: 'Wild mushroom, parmesan. $26' },
              { title: 'Burnt Honey Tart', body: 'Vanilla bean, sea salt. $12' },
            ],
          },
        },
      ],
    },
    {
      id: 'reserve',
      route: '/reserve',
      title: 'Reserve — Ember & Oak',
      description: 'Book your table at Ember & Oak.',
      sections: [
        {
          id: 'reserve-hero',
          type: 'hero',
          content: {
            heading: 'Reserve a Table',
            subheading: 'We can’t wait to host you.',
          },
        },
        {
          id: 'reserve-form',
          type: 'contact',
          content: {
            heading: 'Book Your Table',
            body: 'Choose your party size, date, and time.',
          },
          formId: 'reservation',
        },
      ],
    },
  ],
  assets: [
    { id: 'signature-dish', url: '/images/restaurant/signature-dish.jpg', mimeType: 'image/jpeg', width: 1600, height: 900, alt: 'The signature wood-fired dish' },
  ],
  menus: [
    {
      id: 'main',
      label: 'Main',
      items: [
        { label: 'Home', target: '/' },
        { label: 'Menu', target: '/menu' },
        { label: 'Reserve', target: '/reserve' },
      ],
    },
  ],
  forms: [
    {
      id: 'reservation',
      title: 'Reservation',
      submitTo: '/api/reservations',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Jane Doe' },
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'jane@example.com' },
        { name: 'party', label: 'Party size', type: 'select', options: ['1', '2', '3', '4', '5+'] },
        { name: 'date', label: 'Date', type: 'text', required: true, placeholder: 'MM/DD/YYYY' },
        { name: 'time', label: 'Time', type: 'select', options: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'] },
        { name: 'notes', label: 'Special requests', type: 'textarea', placeholder: 'Allergies, celebrations...' },
      ],
    },
  ],
};
