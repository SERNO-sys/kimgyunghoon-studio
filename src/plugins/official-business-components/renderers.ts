/**
 * AWIE V2 - Phase 13.5: Official Business Components Plugin - Renderers.
 *
 * The semantic section renderers that power the 6 Reference Products. Each
 * renderer is a framework-agnostic RendererExtension that consumes presentation
 * data (from the SSOT ThemeConfig section) and produces a RenderNode tree.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. These renderers extend the platform ON TOP
 * of the frozen core; they do NOT modify the core.
 *
 * ZERO CORE IMPORTS (Phase 13.3): This Plugin imports ONLY from `@awie/sdk`.
 * It MUST NEVER import an internal core module. The CI Architecture Guard
 * enforces this rule on the `src/plugins/` directory.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. NO BUSINESS LOGIC (Constitution #10)
 *      These renderers NEVER interpret business meaning. They only map section
 *      presentation data to a RenderNode. They do not know what a "business"
 *      is, what an "industry" is, or what a "recipe" is.
 *
 *   2. DETERMINISM (Constitution #12)
 *      Each renderer is pure and deterministic: the same input always produces
 *      the same RenderNode.
 *
 *   3. SEMANTIC PROPS ONLY
 *      The produced RenderNode props use generic presentation vocabulary
 *      (heading, body, items, media, actions). They NEVER use page-specific
 *      names like `title`, `imageUrl`, or `businessName`.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure presentation translation for the Developer Platform.
 */

import type {
  AwieRenderContext,
  AwieRenderFunction,
  RendererExtension,
} from '@awie/sdk';

/**
 * A helper to read a string value from a section's content.
 *
 * @param content The section content map.
 * @param key The content key.
 * @returns The string value, or undefined.
 */
function contentString(content: Record<string, unknown>, key: string): string | undefined {
  const value = content[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * A helper to read an array of items from a section's content.
 *
 * @param content The section content map.
 * @param key The content key.
 * @returns The array of items, or an empty array.
 */
function contentItems(content: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = content[key];
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
      )
    : [];
}

/**
 * Builds a semantic RendererExtension for a given section type.
 *
 * This is a pure factory. It produces a framework-agnostic RendererExtension
 * that maps a section's presentation data to a RenderNode whose props use the
 * generic semantic vocabulary (heading, body, items, media, actions).
 *
 * @param id The stable renderer id.
 * @param sectionType The semantic section type this renderer handles.
 * @param componentId The component implementation id in the RenderNode.
 * @param mapContent A pure function that maps section content to semantic props.
 * @returns A RendererExtension.
 */
function buildRenderer(
  id: string,
  sectionType: string,
  componentId: string,
  mapContent: (content: Record<string, unknown>) => Record<string, unknown>,
): RendererExtension {
  const render: AwieRenderFunction = (
    props: Record<string, unknown>,
    context: AwieRenderContext,
  ) => {
    const content = (props['content'] as Record<string, unknown> | undefined) ?? {};
    const semanticProps = mapContent(content);

    return {
      type: 'element',
      componentId,
      props: semanticProps,
      children: [],
      id,
      key: id,
      metadata: {
        sectionType,
        plugin: 'official-business-components',
        locale: context.locale,
      },
    };
  };

  return {
    kind: 'renderer',
    id,
    version: '1.0.0',
    core: { version: '2.0.0' },
    sectionType,
    render,
  };
}

/**
 * The Features renderer.
 *
 * Renders a generic feature/benefit list. Consumes `heading`, `body`, and
 * `items` (each item carrying `title` and `body`). This is the generic list
 * section used across the Reference Products (practice areas, departments,
 * services, sermons, events).
 */
export const featuresRenderer: RendererExtension = buildRenderer(
  'obc.features',
  'features',
  'features',
  (content) => ({
    heading: contentString(content, 'heading'),
    body: contentString(content, 'body'),
    items: contentItems(content, 'items').map((item) => ({
      title: contentString(item, 'title'),
      body: contentString(item, 'body'),
    })),
  }),
);

/**
 * The Gallery renderer.
 *
 * Renders a grid of media items. Consumes `heading`, `body`, and `items`
 * (each item carrying `media` and `caption`).
 */
export const galleryRenderer: RendererExtension = buildRenderer(

  'obc.gallery',
  'gallery',
  'gallery',
  (content) => ({
    heading: contentString(content, 'heading'),
    body: contentString(content, 'body'),
    items: contentItems(content, 'items').map((item) => ({
      media: item['media'],
      caption: contentString(item, 'caption'),
    })),
  }),
);

/**
 * The Menu renderer.
 *
 * Renders a list of menu items. Consumes `heading`, `body`, and `items`
 * (each item carrying `name`, `description`, and `price`).
 */
export const menuRenderer: RendererExtension = buildRenderer(
  'obc.menu',
  'menu',
  'menu',
  (content) => ({
    heading: contentString(content, 'heading'),
    body: contentString(content, 'body'),
    items: contentItems(content, 'items').map((item) => ({
      name: contentString(item, 'name'),
      description: contentString(item, 'description'),
      price: contentString(item, 'price'),
    })),
  }),
);

/**
 * The FAQ renderer.
 *
 * Renders a list of questions and answers. Consumes `heading` and `items`
 * (each item carrying `question` and `answer`).
 */
export const faqRenderer: RendererExtension = buildRenderer(
  'obc.faq',
  'faq',
  'faq',
  (content) => ({
    heading: contentString(content, 'heading'),
    items: contentItems(content, 'items').map((item) => ({
      question: contentString(item, 'question'),
      answer: contentString(item, 'answer'),
    })),
  }),
);

/**
 * The Contact renderer.
 *
 * Renders contact information and a call-to-action. Consumes `heading`,
 * `body`, `phone`, `email`, `address`, and `actions`.
 */
export const contactRenderer: RendererExtension = buildRenderer(
  'obc.contact',
  'contact',
  'contact',
  (content) => ({
    heading: contentString(content, 'heading'),
    body: contentString(content, 'body'),
    phone: contentString(content, 'phone'),
    email: contentString(content, 'email'),
    address: contentString(content, 'address'),
    actions: contentItems(content, 'actions').map((action) => ({
      label: contentString(action, 'label'),
      target: contentString(action, 'target'),
      variant: contentString(action, 'variant'),
    })),
  }),
);

/**
 * The Map renderer.
 *
 * Renders an embedded map. Consumes `heading`, `address`, and `embedUrl`.
 */
export const mapRenderer: RendererExtension = buildRenderer(
  'obc.map',
  'map',
  'map',
  (content) => ({
    heading: contentString(content, 'heading'),
    address: contentString(content, 'address'),
    embedUrl: contentString(content, 'embedUrl'),
  }),
);

/**
 * The Services renderer.
 *
 * Renders a list of services. Consumes `heading`, `body`, and `items`
 * (each item carrying `name` and `description`).
 */
export const servicesRenderer: RendererExtension = buildRenderer(
  'obc.services',
  'services',
  'services',
  (content) => ({
    heading: contentString(content, 'heading'),
    body: contentString(content, 'body'),
    items: contentItems(content, 'items').map((item) => ({
      name: contentString(item, 'name'),
      description: contentString(item, 'description'),
    })),
  }),
);

/**
 * The Doctors renderer.
 *
 * Renders a list of team members. Consumes `heading`, `body`, and `items`
 * (each item carrying `name`, `role`, and `media`).
 */
export const doctorsRenderer: RendererExtension = buildRenderer(
  'obc.doctors',
  'doctors',
  'doctors',
  (content) => ({
    heading: contentString(content, 'heading'),
    body: contentString(content, 'body'),
    items: contentItems(content, 'items').map((item) => ({
      name: contentString(item, 'name'),
      role: contentString(item, 'role'),
      media: item['media'],
    })),
  }),
);

/**
 * The Portfolio renderer.
 *
 * Renders a portfolio grid. Consumes `heading`, `body`, and `items`
 * (each item carrying `media` and `caption`).
 */
export const portfolioRenderer: RendererExtension = buildRenderer(
  'obc.portfolio',
  'portfolio',
  'portfolio',
  (content) => ({
    heading: contentString(content, 'heading'),
    body: contentString(content, 'body'),
    items: contentItems(content, 'items').map((item) => ({
      media: item['media'],
      caption: contentString(item, 'caption'),
    })),
  }),
);

/**
 * The Sermons renderer.
 *
 * Renders a list of sermons. Consumes `heading`, `body`, and `items`
 * (each item carrying `title`, `date`, and `description`).
 */
export const sermonsRenderer: RendererExtension = buildRenderer(
  'obc.sermons',
  'sermons',
  'sermons',
  (content) => ({
    heading: contentString(content, 'heading'),
    body: contentString(content, 'body'),
    items: contentItems(content, 'items').map((item) => ({
      title: contentString(item, 'title'),
      date: contentString(item, 'date'),
      description: contentString(item, 'description'),
    })),
  }),
);

/**
 * The Events renderer.
 *
 * Renders a list of events. Consumes `heading`, `body`, and `items`
 * (each item carrying `title`, `date`, and `description`).
 */
export const eventsRenderer: RendererExtension = buildRenderer(
  'obc.events',
  'events',
  'events',
  (content) => ({
    heading: contentString(content, 'heading'),
    body: contentString(content, 'body'),
    items: contentItems(content, 'items').map((item) => ({
      title: contentString(item, 'title'),
      date: contentString(item, 'date'),
      description: contentString(item, 'description'),
    })),
  }),
);

/**
 * The Reservation CTA renderer.
 *
 * Renders a call-to-action for reservations. Consumes `heading`, `body`,
 * `phone`, and `actions`.
 */
export const reservationCtaRenderer: RendererExtension = buildRenderer(
  'obc.reservation-cta',
  'reservation-cta',
  'reservation-cta',
  (content) => ({
    heading: contentString(content, 'heading'),
    body: contentString(content, 'body'),
    phone: contentString(content, 'phone'),
    actions: contentItems(content, 'actions').map((action) => ({
      label: contentString(action, 'label'),
      target: contentString(action, 'target'),
      variant: contentString(action, 'variant'),
    })),
  }),
);

/**
 * The Booking CTA renderer.
 *
 * Renders a call-to-action for bookings. Consumes `heading`, `body`,
 * `phone`, and `actions`.
 */
export const bookingCtaRenderer: RendererExtension = buildRenderer(
  'obc.booking-cta',
  'booking-cta',
  'booking-cta',
  (content) => ({
    heading: contentString(content, 'heading'),
    body: contentString(content, 'body'),
    phone: contentString(content, 'phone'),
    actions: contentItems(content, 'actions').map((action) => ({
      label: contentString(action, 'label'),
      target: contentString(action, 'target'),
      variant: contentString(action, 'variant'),
    })),
  }),
);

/**
 * The complete set of Official Business Components renderers.
 *
 * This is the modular, scalable registry of semantic section renderers that
 * the plugin provides. Future plugins (e.g. official-music-player,
 * official-commerce) would provide their own renderer sets.
 */
export const officialBusinessRenderers: readonly RendererExtension[] = [
  featuresRenderer,
  galleryRenderer,
  menuRenderer,
  faqRenderer,
  contactRenderer,
  mapRenderer,
  servicesRenderer,
  doctorsRenderer,
  portfolioRenderer,
  sermonsRenderer,
  eventsRenderer,
  reservationCtaRenderer,
  bookingCtaRenderer,
];


