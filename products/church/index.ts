/**
 * AWIE V2 - Product Development Phase: Reference Product 04 — Church.
 *
 * Focus: Community, Audio/Video integration.
 *
 * The "One-Line UX" Golden Prompt that resolves into this ThemeConfig:
 *
 *   "Build a church website that feels like a warm welcome — a hero inviting
 *    people to join us, a section for this week’s sermon with audio and video,
 *    a community events list, and a way to get connected."
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
 * The Church product declaration.
 *
 * A complete, production-ready reference site focused on community and
 * audio/video integration. It declares a home page (hero + sermon + events +
 * get connected), a sermons page, and a visit page, a flat asset registry, a
 * main navigation menu, and a get-connected form.
 */
export const churchDeclaration: ProductDeclaration = {
  id: 'church',
  title: 'Grace Community Church',
  tagline: 'Everyone is welcome here.',
  description:
    'Grace Community Church is a welcoming congregation gathering every Sunday to worship, grow, and serve together.',
  locale: 'en',
  domain: 'gracecommunity.example',
  intent: 'community',
  industry: 'church',
  reasoning:
    'A church needs warmth and belonging. I chose a calm, hopeful palette, a welcoming hero, a sermon section with audio/video, and a community events list to foster connection.',
  settings: {
    primaryColor: '#4a6fa5',
    secondaryColor: '#c9a227',
    backgroundColor: '#f7f5f0',
    textColor: '#2c2c2c',
    font: 'serif',
    spacing: 'lg',
    radius: 'md',
    skin: { colorPalette: 'grace', fontPairing: 'serif', buttonStyle: 'rounded' },
    skeleton: { headerType: 'centered', heroType: 'full-bleed' },
  },
  pages: [
    {
      id: 'home',
      route: '/',
      title: 'Grace Community Church — Everyone is Welcome',
      description: 'Join us Sunday at 10am for worship, community, and growth.',
      isHome: true,
      sections: [
        {
          id: 'hero',
          type: 'hero',
          content: {
            heading: 'Everyone is welcome here.',
            subheading: 'Join us Sunday at 10am for worship, community, and growth.',
            media: 'sanctuary',
            mediaAlt: 'The Grace Community Church sanctuary',
            actions: [
              { label: 'Plan your visit', target: '/visit', variant: 'primary' },
              { label: 'Watch a sermon', target: '/sermons' },
            ],
          },
          assetIds: ['sanctuary'],
        },
        {
          id: 'sermon',
          type: 'features',
          content: {
            heading: 'This Week’s Sermon',
            body: 'Listen or watch the latest message.',
            items: [
              { title: 'Finding Rest', body: 'Audio · 38 min', media: 'sermon-audio' },
              { title: 'Finding Rest', body: 'Video · 38 min', media: 'sermon-video' },
            ],
          },
          assetIds: ['sermon-audio', 'sermon-video'],
        },
        {
          id: 'events',
          type: 'features',
          content: {
            heading: 'Community Events',
            body: 'Ways to connect, serve, and grow together.',
            items: [
              { title: 'Sunday Worship', body: 'Every Sunday · 10am' },
              { title: 'Youth Group', body: 'Fridays · 6pm' },
              { title: 'Community Meal', body: 'First Saturday · 12pm' },
              { title: 'Bible Study', body: 'Wednesdays · 7pm' },
            ],
          },
        },
        {
          id: 'connect',
          type: 'contact',
          content: {
            heading: 'Get Connected',
            body: 'Tell us a little about yourself and we will reach out.',
          },
          formId: 'connect',
        },
      ],
    },
    {
      id: 'sermons',
      route: '/sermons',
      title: 'Sermons — Grace Community Church',
      description: 'Listen and watch recent sermons.',
      sections: [
        {
          id: 'sermons-hero',
          type: 'hero',
          content: {
            heading: 'Sermons',
            subheading: 'Recent messages, available as audio and video.',
            actions: [{ label: 'Plan your visit', target: '/visit', variant: 'primary' }],
          },
        },
        {
          id: 'sermons-list',
          type: 'features',
          content: {
            heading: 'Recent Messages',
            body: 'Catch up on what you missed.',
            items: [
              { title: 'Finding Rest', body: 'Audio · Video · 38 min' },
              { title: 'The Good Shepherd', body: 'Audio · Video · 41 min' },
              { title: 'A Heart of Gratitude', body: 'Audio · Video · 35 min' },
            ],
          },
        },
      ],
    },
    {
      id: 'visit',
      route: '/visit',
      title: 'Plan Your Visit — Grace Community Church',
      description: 'What to expect when you visit.',
      sections: [
        {
          id: 'visit-hero',
          type: 'hero',
          content: {
            heading: 'Plan Your Visit',
            subheading: 'We would love to meet you.',
            actions: [{ label: 'Get connected', target: '/connect', variant: 'primary' }],
          },
        },
        {
          id: 'visit-text',
          type: 'text',
          content: {
            heading: 'What to Expect',
            body: 'Come as you are. Services last about an hour, with music, a message, and time to connect. Kids’ ministry is available.',
          },
        },
      ],
    },
  ],
  assets: [
    { id: 'sanctuary', url: '/images/church/sanctuary.jpg', mimeType: 'image/jpeg', width: 1600, height: 900, alt: 'The Grace Community Church sanctuary' },
    { id: 'sermon-audio', url: '/audio/church/sermon-rest.mp3', mimeType: 'audio/mpeg', alt: 'Audio of the sermon Finding Rest' },
    { id: 'sermon-video', url: '/video/church/sermon-rest.mp4', mimeType: 'video/mp4', width: 1280, height: 720, alt: 'Video of the sermon Finding Rest' },
  ],
  menus: [
    {
      id: 'main',
      label: 'Main',
      items: [
        { label: 'Home', target: '/' },
        { label: 'Sermons', target: '/sermons' },
        { label: 'Visit', target: '/visit' },
        { label: 'Connect', target: '/connect' },
      ],
    },
  ],
  forms: [
    {
      id: 'connect',
      title: 'Get Connected',
      submitTo: '/api/connect',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Jane Doe' },
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'jane@example.com' },
        { name: 'interest', label: 'I’m interested in', type: 'select', options: ['Visiting', 'Joining a group', 'Volunteering', 'Prayer'] },
        { name: 'message', label: 'Anything else?', type: 'textarea', placeholder: 'Tell us how we can help...' },
      ],
    },
  ],
};
