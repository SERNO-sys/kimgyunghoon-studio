/**
 * AWIE V2 - ThemeConfig v2 Zod schemas.
 *
 * Strict Zod schemas for the ThemeConfig v2 shape. These schemas enforce the
 * structural contract so a malformed config can never reach the renderer.
 *
 * Cross-reference validation (e.g. page -> section references, dead resources,
 * circular references) is intentionally NOT expressed here — it lives in the
 * validator (validator.ts) because a flat schema cannot express relationships
 * between collections.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data validation.
 */

import { z } from 'zod';
import { CURRENT_SCHEMA_VERSION } from './types';

/** A stable, unique resource identifier. */
export const resourceIdSchema = z.string().min(1);

/** A URL path starting with "/" (e.g. "/", "/about"). */
export const routePathSchema = z
  .string()
  .regex(/^\//, 'route must start with "/"')
  .regex(/^\/[a-z0-9\-/]*$/, 'route must contain only lowercase letters, digits, hyphens, and slashes');

/** A color value (hex, rgb, or named). */
export const colorSchema = z.string().min(1);

/** A size/spacing token. */
export const sizeTokenSchema = z.string().min(1);

/** A font token. */
export const fontTokenSchema = z.string().min(1);

/** An ISO-8601 timestamp string. */
export const timestampSchema = z.string().min(1);

/** Versioning metadata. */
export const themeConfigVersioningSchema = z.object({
  schemaVersion: z.number().int().positive(),
  createdVersion: z.string().min(1),
  minimumReaderVersion: z.string().min(1),
  migrationTarget: z.number().int().positive(),
});

/** Identity + provenance metadata. */
export const themeConfigMetadataSchema = z.object({
  title: z.string().min(1),
  tagline: z.string().optional(),
  description: z.string().optional(),
  locale: z.string().optional(),
  domain: z.string().optional(),
  favicon: resourceIdSchema.optional(),
  logo: resourceIdSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  generator: z.string().min(1),
  generatorVersion: z.string().min(1),
});

/** The business intent. */
export const intentTypeSchema = z.enum([
  'brand_experience',
  'authority',
  'conversion',
  'commerce',
  'community',
]);

/** The visual style module (Skin). */
export const skinSchema = z.object({
  colorPalette: z.string().min(1),
  fontPairing: fontTokenSchema,
  buttonStyle: z.string().optional(),
});

/** The structural module (Skeleton). */
export const skeletonSchema = z.object({
  headerType: z.string().min(1),
  heroType: z.string().min(1),
});

/** The AI's design rationale. */
export const aiDesignReportSchema = z.object({
  analyzedIndustry: z.string().min(1),
  reasoning: z.string().min(1),
});

/** A single page definition. */
export const pageConfigSchema = z.object({
  id: resourceIdSchema,
  route: routePathSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  sectionIds: z.array(resourceIdSchema),
  isHome: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

/** The type of a section. */
export const sectionTypeSchema = z.enum([
  'hero',
  'text',
  'image',
  'gallery',
  'features',
  'testimonials',
  'cta',
  'contact',
  'footer',
  'custom',
]);

/** Visual settings for a section. */
export const sectionSettingsSchema = z
  .object({
    backgroundColor: colorSchema.optional(),
    textColor: colorSchema.optional(),
    padding: sizeTokenSchema.optional(),
    maxWidth: sizeTokenSchema.optional(),
    fullBleed: z.boolean().optional(),
  })
  .catchall(z.unknown());

/** A self-contained section definition. */
export const sectionConfigSchema = z.object({
  id: resourceIdSchema,
  type: sectionTypeSchema,
  content: z.record(z.string(), z.unknown()),
  assetIds: z.array(resourceIdSchema).optional(),
  formId: resourceIdSchema.optional(),
  settings: sectionSettingsSchema.optional(),
});

/** A media asset. */
export const assetConfigSchema = z.object({
  id: resourceIdSchema,
  url: z.string().min(1),
  mimeType: z.string().optional(),
  width: z.number().int().nonnegative().optional(),
  height: z.number().int().nonnegative().optional(),
  alt: z.string().optional(),
});

/** Global site settings. */
export const siteSettingsSchema = z
  .object({
    primaryColor: colorSchema.optional(),
    secondaryColor: colorSchema.optional(),
    backgroundColor: colorSchema.optional(),
    textColor: colorSchema.optional(),
    font: fontTokenSchema.optional(),
    spacing: sizeTokenSchema.optional(),
    radius: sizeTokenSchema.optional(),
    skin: skinSchema.optional(),
    skeleton: skeletonSchema.optional(),
    aiDesignReport: aiDesignReportSchema.optional(),
  })
  .catchall(z.unknown());

/** A navigation menu item. */
export const menuItemSchema: z.ZodType<{
  label: string;
  target: string;
  children?: unknown[];
}> = z.lazy(() =>
  z.object({
    label: z.string().min(1),
    target: z.string().min(1),
    children: z.array(menuItemSchema).optional(),
  })
);

/** A navigation menu. */
export const menuConfigSchema = z.object({
  id: resourceIdSchema,
  label: z.string().min(1),
  items: z.array(menuItemSchema),
});

/** A form field. */
export const formFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'email', 'tel', 'textarea', 'select', 'checkbox']),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

/** A form definition. */
export const formConfigSchema = z.object({
  id: resourceIdSchema,
  title: z.string().min(1),
  fields: z.array(formFieldSchema),
  submitTo: z.string().optional(),
});

/** The resources collection. */
export const themeResourcesSchema = z.object({
  pages: z.array(pageConfigSchema),
  sections: z.array(sectionConfigSchema),
  assets: z.array(assetConfigSchema),
  settings: siteSettingsSchema,
  menus: z.array(menuConfigSchema),
  forms: z.array(formConfigSchema),
});

/** Reserved for future SEO / Accessibility policies. */
export const themePoliciesSchema = z.object({}).catchall(z.unknown());

/** The ThemeConfig v2 schema. */
export const themeConfigSchema = z.object({
  metadata: themeConfigMetadataSchema,
  intent: intentTypeSchema.optional(),
  resources: themeResourcesSchema,
  policies: themePoliciesSchema,
});

/** The current ThemeConfig v2 schema version. */
export const CURRENT_THEME_CONFIG_VERSION = CURRENT_SCHEMA_VERSION;

/** The Zod schema for the current ThemeConfig v2. */
export type ThemeConfigSchema = z.infer<typeof themeConfigSchema>;
