/**
 * AWIE V2 - Product Development Phase: Reference Product 06 — Hospital.
 *
 * Focus: Information architecture, FAQ, Booking.
 *
 * The "One-Line UX" Golden Prompt that resolves into this ThemeConfig:
 *
 *   "Build a hospital website that is calm and easy to navigate — a clear hero
 *    with a prominent 'Book an appointment' action, a departments overview,
 *    a reassuring FAQ, and a simple appointment booking form."
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
 * The Hospital product declaration.
 *
 * A complete, production-ready reference site focused on information
 * architecture, FAQ, and booking. It declares a home page (hero + departments +
 * FAQ + booking), a departments page, and a booking page, a flat asset registry,
 * a main navigation menu, and an appointment booking form.
 */
export const hospitalDeclaration: ProductDeclaration = {
  id: 'hospital',
  title: 'Mercy General Hospital',
  tagline: 'Care you can count on.',
  description:
    'Mercy General Hospital provides compassionate, comprehensive care across a full range of specialties.',
  locale: 'en',
  domain: 'mercygeneral.example',
  intent: 'authority',
  industry: 'healthcare',
  reasoning:
    'A hospital must be calm, clear, and trustworthy. I chose a clean blue-and-white palette, a clear information architecture with departments, a reassuring FAQ, and a simple booking form to reduce anxiety and drive appointments.',
  settings: {
    primaryColor: '#1f6f8b',
    secondaryColor: '#2a9d8f',
    backgroundColor: '#f4f8fa',
    textColor: '#1c2b33',
    font: 'sans',
    spacing: 'md',
    radius: 'md',
    skin: { colorPalette: 'clinical', fontPairing: 'sans', buttonStyle: 'rounded' },
    skeleton: { headerType: 'top', heroType: 'split' },
  },
  pages: [
    {
      id: 'home',
      route: '/',
      title: 'Mercy General Hospital — Care You Can Count On',
      description: 'Compassionate, comprehensive care across every specialty.',
      isHome: true,
      sections: [
        {
          id: 'hero',
          type: 'hero',
          content: {
            heading: 'Care you can count on.',
            subheading:
              'Compassionate, comprehensive care across every specialty — available when you need us.',
            media: 'hospital',
            mediaAlt: 'The Mercy General Hospital entrance',
            actions: [
              { label: 'Book an appointment', target: '/booking', variant: 'primary' },
              { label: 'Our departments', target: '/departments' },
            ],
          },
          assetIds: ['hospital'],
        },
        {
          id: 'departments',
          type: 'features',
          content: {
            heading: 'Departments',
            body: 'A full range of specialties under one roof.',
            items: [
              { title: 'Cardiology', body: 'Heart health and diagnostics.' },
              { title: 'Pediatrics', body: 'Care for children of all ages.' },
              { title: 'Orthopedics', body: 'Bones, joints, and mobility.' },
              { title: 'Emergency', body: '24/7 urgent and critical care.' },
            ],
          },
        },
        {
          id: 'faq',
          type: 'features',
          content: {
            heading: 'Frequently Asked Questions',
            body: 'Answers to the questions we hear most.',
            items: [
              { title: 'Do I need a referral?', body: 'No referral is required for most appointments.' },
              { title: 'What insurance do you accept?', body: 'We accept most major insurance plans.' },
              { title: 'What are visiting hours?', body: 'Visiting hours are 10am–8pm daily.' },
              { title: 'How do I get my records?', body: 'Request records through your patient portal.' },
            ],
          },
        },
        {
          id: 'booking',
          type: 'contact',
          content: {
            heading: 'Book an Appointment',
            body: 'Schedule your visit in under two minutes.',
          },
          formId: 'appointment',
        },
      ],
    },
    {
      id: 'departments',
      route: '/departments',
      title: 'Departments — Mercy General Hospital',
      description: 'Explore our departments and specialties.',
      sections: [
        {
          id: 'departments-hero',
          type: 'hero',
          content: {
            heading: 'Our Departments',
            subheading: 'Comprehensive care across every specialty.',
            actions: [{ label: 'Book an appointment', target: '/booking', variant: 'primary' }],
          },
        },
        {
          id: 'departments-list',
          type: 'features',
          content: {
            heading: 'Specialties',
            body: 'Led by board-certified physicians.',
            items: [
              { title: 'Cardiology', body: 'Heart health, diagnostics, and surgery.' },
              { title: 'Pediatrics', body: 'Primary and specialty care for children.' },
              { title: 'Orthopedics', body: 'Joint replacement and sports medicine.' },
              { title: 'Neurology', body: 'Brain, spine, and nervous system care.' },
              { title: 'Oncology', body: 'Cancer diagnosis and treatment.' },
              { title: 'Emergency', body: '24/7 urgent and critical care.' },
            ],
          },
        },
      ],
    },
    {
      id: 'booking',
      route: '/booking',
      title: 'Book an Appointment — Mercy General Hospital',
      description: 'Schedule your visit at Mercy General Hospital.',
      sections: [
        {
          id: 'booking-hero',
          type: 'hero',
          content: {
            heading: 'Book an Appointment',
            subheading: 'We will confirm your visit by email.',
          },
        },
        {
          id: 'booking-form',
          type: 'contact',
          content: {
            heading: 'Schedule Your Visit',
            body: 'Choose a department and preferred time.',
          },
          formId: 'appointment',
        },
      ],
    },
  ],
  assets: [
    { id: 'hospital', url: '/images/hospital/hospital.jpg', mimeType: 'image/jpeg', width: 1600, height: 900, alt: 'The Mercy General Hospital entrance' },
  ],
  menus: [
    {
      id: 'main',
      label: 'Main',
      items: [
        { label: 'Home', target: '/' },
        { label: 'Departments', target: '/departments' },
        { label: 'Book', target: '/booking' },
      ],
    },
  ],
  forms: [
    {
      id: 'appointment',
      title: 'Appointment Booking',
      submitTo: '/api/appointments',
      fields: [
        { name: 'name', label: 'Full name', type: 'text', required: true, placeholder: 'Jane Doe' },
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'jane@example.com' },
        { name: 'phone', label: 'Phone', type: 'tel', placeholder: '(555) 010-0100' },
        { name: 'department', label: 'Department', type: 'select', options: ['Cardiology', 'Pediatrics', 'Orthopedics', 'Neurology', 'Oncology', 'Emergency'] },
        { name: 'date', label: 'Preferred date', type: 'text', required: true, placeholder: 'MM/DD/YYYY' },
        { name: 'reason', label: 'Reason for visit', type: 'textarea', placeholder: 'Briefly describe your concern...' },
      ],
    },
  ],
};
