/**
 * AWIE V2 - ThemeConfig v2 Types.
 *
 * ThemeConfig is the Single Source of Truth (SSOT) for a site. Nothing outside
 * ThemeConfig may influence rendering. The AI decides, ThemeConfig stores, and
 * the Renderer renders.
 *
 * Root structure (STRICTLY limited to these five properties):
 *
 *   ThemeConfig
 *   ├── metadata    (identity, timestamps, generator, versioning)
 *   ├── intent      (the business intent inferred by the AI)
 *   ├── resources   (flat collections: pages, sections, assets, settings, menus, forms)
 *   ├── seo         (dedicated SEO node: OpenGraph, Twitter, Canonical, JSON-LD)
 *   └── policies    (reserved for future Accessibility policies)
 *
 * SEO IS PRESENTATION: The `seo` node is a dedicated, deterministic assembly
 * of passive SEO read models. It is NOT a new domain. The Composition Service
 * merges Global SEO, Local SEO, and Plugin-contributed structured data into
 * this node. It MUST NOT decide fallback policies — fallback is an Application
 * Layer business rule resolved BEFORE the Composition Boundary.
 *
 * IMMUTABILITY: ThemeConfig is an immutable SSOT after validation. The Renderer
 * must never mutate it; the AI generates new configs instead.
 *
 * RESOURCE MODEL: Resource collections are FLAT. Nested ownership is

 * PROHIBITED. All resources use stable ResourceIds rather than inline objects:
 * Pages reference sectionIds, Menus reference pageId, Sections reference
 * assetId/formId.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling.
 */

/** The current ThemeConfig schema version supported by the renderer. */
export const CURRENT_SCHEMA_VERSION = 2;

/** A stable, unique identifier for any resource. */
export type ResourceId = string;

/** A URL path (e.g. "/", "/about", "/contact"). */
export type RoutePath = string;

/** A color value in hex, rgb, or named form. */
export type ColorValue = string;

/** A spacing/sizing token (e.g. "sm", "md", "lg", "4px", "1rem"). */
export type SizeToken = string;

/** A font family token (e.g. "sans", "serif", "mono"). */
export type FontToken = string;

/** An ISO-8601 timestamp string. */
export type Timestamp = string;

/**
 * Versioning metadata. Every ThemeConfig includes these fields so older
 * versions can be migrated through adapters. The renderer supports only the
 * current schema version.
 */
export interface ThemeConfigVersioning {
  /** The schema version this config conforms to. */
  schemaVersion: number;
  /** The AWIE version that created this config. */
  createdVersion: string;
  /** The minimum reader (renderer) version required to consume this config. */
  minimumReaderVersion: string;
  /** The schema version this config should be migrated toward. */
  migrationTarget: number;
}

/** Identity + provenance metadata for a ThemeConfig. */
export interface ThemeConfigMetadata {
  /** The site title. */
  title: string;
  /** A short tagline or subtitle. */
  tagline?: string;
  /** A longer site description (SEO). */
  description?: string;
  /** The primary language/locale (e.g. "ko", "en"). */
  locale?: string;
  /** The site's canonical domain, when known. */
  domain?: string;
  /** A favicon asset reference. */
  favicon?: ResourceId;
  /** A logo asset reference. */
  logo?: ResourceId;
  /** When this config was created (ISO-8601). */
  createdAt: Timestamp;
  /** When this config was last updated (ISO-8601). */
  updatedAt: Timestamp;
  /** The generator that produced this config (e.g. "awie-engine"). */
  generator: string;
  /** The generator version that produced this config. */
  generatorVersion: string;
}

/** The user's primary business objective, inferred by the AI. */
export type IntentType =
  | 'brand_experience'
  | 'authority'
  | 'conversion'
  | 'commerce'
  | 'community';

/** The visual style module (Skin) chosen by the AI. */
export interface Skin {
  /** The color palette identifier. */
  colorPalette: string;
  /** The font pairing identifier. */
  fontPairing: FontToken;
  /** Optional button style identifier. */
  buttonStyle?: string;
}

/** The structural module (Skeleton) chosen by the AI. */
export interface Skeleton {
  /** The header layout identifier. */
  headerType: string;
  /** The hero layout identifier. */
  heroType: string;
}

/** The AI's design rationale, exposed to the user for trust. */
export interface AiDesignReport {
  /** The industry the AI inferred from the user's input. */
  analyzedIndustry: string;
  /** A short, human-readable explanation of the design choice. */
  reasoning: string;
}

/** A single page definition. Pages reference section IDs. */
export interface PageConfig {
  /** Unique page id (e.g. "home"). */
  id: ResourceId;
  /** The URL route for this page (e.g. "/", "/about"). */
  route: RoutePath;
  /** The page title. */
  title: string;
  /** The page description (SEO). */
  description?: string;
  /** Ordered section references composing this page. */
  sectionIds: ResourceId[];
  /** Whether this page is the site's home page. */
  isHome?: boolean;
  /** Whether this page is hidden from navigation. */
  hidden?: boolean;
}

/** The type of a section. */
export type SectionType =
  | 'hero'
  | 'text'
  | 'image'
  | 'gallery'
  | 'features'
  | 'testimonials'
  | 'cta'
  | 'contact'
  | 'footer'
  | 'custom';

/** A self-contained section definition. */
export interface SectionConfig {
  /** Unique section id (e.g. "hero"). */
  id: ResourceId;
  /** The section type. */
  type: SectionType;
  /** The section's content (type-specific). */
  content: Record<string, unknown>;
  /** Optional asset references used by this section. */
  assetIds?: ResourceId[];
  /** Optional form reference used by this section. */
  formId?: ResourceId;
  /** The section's visual settings. */
  settings?: SectionSettings;
}

/** Visual settings for a section. */
export interface SectionSettings {
  /** The section background color. */
  backgroundColor?: ColorValue;
  /** The section text color. */
  textColor?: ColorValue;
  /** The section padding token. */
  padding?: SizeToken;
  /** The section max-width token. */
  maxWidth?: SizeToken;
  /** Whether the section is full-bleed. */
  fullBleed?: boolean;
  /** Arbitrary extra settings. */
  [key: string]: unknown;
}

/** A media asset referenced by sections. */
export interface AssetConfig {
  /** Unique asset id (e.g. "logo", "hero-bg"). */
  id: ResourceId;
  /** The asset URL or storage key. */
  url: string;
  /** The asset MIME type (e.g. "image/png"). */
  mimeType?: string;
  /** The asset width in pixels, when known. */
  width?: number;
  /** The asset height in pixels, when known. */
  height?: number;
  /** Alt text for accessibility. */
  alt?: string;
}

/** Global site settings — the container for global config, visual frameworks, and system variables. */
export interface SiteSettings {
  /** The site's primary color. */
  primaryColor?: ColorValue;
  /** The site's secondary color. */
  secondaryColor?: ColorValue;
  /** The site's background color. */
  backgroundColor?: ColorValue;
  /** The site's text color. */
  textColor?: ColorValue;
  /** The site's font pairing. */
  font?: FontToken;
  /** The site's base spacing scale. */
  spacing?: SizeToken;
  /** The site's border radius token. */
  radius?: SizeToken;
  /** The visual style module (Skin). */
  skin?: Skin;
  /** The structural module (Skeleton). */
  skeleton?: Skeleton;
  /** The AI's design rationale. */
  aiDesignReport?: AiDesignReport;
  /** Arbitrary extra settings. */
  [key: string]: unknown;
}

/** A navigation menu item. */
export interface MenuItem {
  /** The menu item label. */
  label: string;
  /** The target route or page reference. */
  target: RoutePath | ResourceId;
  /** Optional child menu items. */
  children?: MenuItem[];
}

/** A navigation menu. */
export interface MenuConfig {
  /** Unique menu id (e.g. "main"). */
  id: ResourceId;
  /** The menu label. */
  label: string;
  /** The menu items. */
  items: MenuItem[];
}

/** A form field definition. */
export interface FormField {
  /** The field name. */
  name: string;
  /** The field label. */
  label: string;
  /** The field type. */
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox';
  /** Whether the field is required. */
  required?: boolean;
  /** Placeholder text. */
  placeholder?: string;
  /** Options for select fields. */
  options?: string[];
}

/** A form definition. */
export interface FormConfig {
  /** Unique form id (e.g. "contact"). */
  id: ResourceId;
  /** The form title. */
  title: string;
  /** The form fields. */
  fields: FormField[];
  /** The submission endpoint or handler key. */
  submitTo?: string;
}

/** The resources collection of a ThemeConfig. All collections are FLAT. */
export interface ThemeResources {
  /** Page definitions. */
  pages: PageConfig[];
  /** Self-contained section definitions. */
  sections: SectionConfig[];
  /** Media assets. */
  assets: AssetConfig[];
  /** Global site settings. */
  settings: SiteSettings;
  /** Navigation menus. */
  menus: MenuConfig[];
  /** Form definitions. */
  forms: FormConfig[];
}

/**
 * OpenGraph metadata for social sharing.
 *
 * SEO IS PRESENTATION: This is a passive, deterministic assembly of the
 * provided OpenGraph read model. It is NOT a new domain.
 */
export interface OpenGraphConfig {
  /** The OpenGraph title. */
  title?: string;
  /** The OpenGraph description. */
  description?: string;
  /** The OpenGraph type (e.g. "website", "article"). */
  type?: string;
  /** The OpenGraph image URL. */
  image?: string;
  /** The OpenGraph URL. */
  url?: string;
  /** The OpenGraph site name. */
  siteName?: string;
  /** The OpenGraph locale (e.g. "ko_KR"). */
  locale?: string;
}

/**
 * Twitter Card metadata for social sharing.
 *
 * SEO IS PRESENTATION: This is a passive, deterministic assembly of the
 * provided Twitter read model. It is NOT a new domain.
 */
export interface TwitterConfig {
  /** The Twitter card type (e.g. "summary_large_image"). */
  card?: string;
  /** The Twitter site handle (e.g. "@handle"). */
  site?: string;
  /** The Twitter creator handle (e.g. "@handle"). */
  creator?: string;
  /** The Twitter title. */
  title?: string;
  /** The Twitter description. */
  description?: string;
  /** The Twitter image URL. */
  image?: string;
}

/**
 * A single JSON-LD structured data node (e.g. Product, MusicRecording,
 * Organization, BreadcrumbList).
 *
 * PLUGIN EXTENSIBILITY: Plugins (Commerce, Music, etc.) contribute structured
 * data schemas into the final ThemeConfig.seo. The Composition Service merges
 * these plugin-contributed nodes deterministically.
 */
export interface JsonLdNode {
  /** The JSON-LD @type (e.g. "Product", "MusicRecording"). */
  type: string;
  /** The JSON-LD payload (raw, uninterpreted). */
  data: Record<string, unknown>;
}

/**
 * The dedicated SEO node of a ThemeConfig.
 *
 * SEO IS PRESENTATION: This node is a deterministic assembly of passive SEO
 * read models (Global SEO, Local SEO, and Plugin-contributed structured data).
 * It MUST NOT decide fallback policies — fallback is an Application Layer
 * business rule resolved BEFORE the Composition Boundary.
 */
export interface ThemeSeo {
  /** The canonical URL for the page/site. */
  canonical?: string;
  /** The robots directive (e.g. "index,follow"). */
  robots?: string;
  /** The OpenGraph metadata. */
  openGraph?: OpenGraphConfig;
  /** The Twitter Card metadata. */
  twitter?: TwitterConfig;
  /** The JSON-LD structured data nodes (site-level + plugin-contributed). */
  jsonLd?: JsonLdNode[];
}

/**
 * Reserved for future Accessibility policies. Intentionally empty for now; the
 * shape will be defined in a later milestone.
 */
export interface ThemePolicies {
  // Reserved for future Accessibility policies.
}

/**
 * The ThemeConfig v2 — the immutable Single Source of Truth for a site.
 *
 * Root structure is STRICTLY limited to: metadata, intent, resources, seo,
 * policies.
 */
export interface ThemeConfig {
  /** Identity, provenance, and versioning metadata. */
  metadata: ThemeConfigMetadata;
  /** The business intent inferred by the AI. */
  intent?: IntentType;
  /** The resources collection (flat arrays). */
  resources: ThemeResources;
  /** The dedicated SEO node (OpenGraph, Twitter, Canonical, JSON-LD). */
  seo?: ThemeSeo;
  /** Reserved for future Accessibility policies. */
  policies: ThemePolicies;
}


