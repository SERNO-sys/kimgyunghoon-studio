/**
 * AWIE V2 - ThemeConfig v2 barrel export.
 *
 * ThemeConfig is the Single Source of Truth (SSOT) for a site. This module
 * exposes the types, Zod schemas, cross-reference validator, and migration
 * adapter. The renderer consumes only validated ThemeConfig v2.
 */
export {
  CURRENT_SCHEMA_VERSION,
  type AiDesignReport,
  type AssetConfig,
  type ColorValue,
  type FontToken,
  type FormConfig,
  type FormField,
  type IntentType,
  type MenuConfig,
  type MenuItem,
  type PageConfig,
  type ResourceId,
  type RoutePath,
  type SectionConfig,
  type SectionSettings,
  type SectionType,
  type SiteSettings,
  type SizeToken,
  type Skin,
  type Skeleton,
  type ThemeConfig,
  type ThemeConfigMetadata,
  type ThemeConfigVersioning,
  type ThemePolicies,
  type ThemeResources,
  type Timestamp,
} from './types';

export {
  CURRENT_THEME_CONFIG_VERSION,
  aiDesignReportSchema,
  assetConfigSchema,
  colorSchema,
  fontTokenSchema,
  formConfigSchema,
  formFieldSchema,
  intentTypeSchema,
  menuConfigSchema,
  menuItemSchema,
  pageConfigSchema,
  resourceIdSchema,
  routePathSchema,
  sectionConfigSchema,
  sectionSettingsSchema,
  sectionTypeSchema,
  siteSettingsSchema,
  sizeTokenSchema,
  skinSchema,
  skeletonSchema,
  themeConfigMetadataSchema,
  themeConfigSchema,
  themeConfigVersioningSchema,
  themePoliciesSchema,
  themeResourcesSchema,
  timestampSchema,
  type ThemeConfigSchema,
} from './schema';

export {
  ThemeConfigValidator,
  type KnownValues,
  type ThemeConfigValidationResult,
  type ThemeConfigValidatorOptions,
  type ValidationIssue,
  type ValidationSeverity,
} from './validator';

export {
  ThemeConfigMigrationAdapter,
  type LegacyThemeConfig,
  type MigrationPreview,
  type MigrationPreviewEntry,
  type MigrationResult,
} from './migration';
