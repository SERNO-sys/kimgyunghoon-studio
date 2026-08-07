/**
 * AWIE V2 - ThemeConfig v2 cross-reference validator.
 *
 * The Zod schema (schema.ts) enforces the structural contract. This validator
 * enforces RELATIONSHIPS between collections that a flat schema cannot express.
 *
 * It uses a DFS (Depth-First Search) / graph-traversal approach to detect:
 *
 *   - Dead resources: orphan sections, unused pages, unused menus, unused
 *     forms, unused assets.
 *   - Circular references: menus or pages that create infinite routing loops.
 *   - Invalid routes: strict format (e.g. "/" or "/about" valid; "//home" or
 *     "abc" invalid).
 *   - Duplicate slugs: case-insensitive (e.g. "About" and "about" collide).
 *   - Invalid references: page -> section, menu -> page, section -> asset/form.
 *
 * The validator is DETERMINISTIC and SIDE-EFFECT FREE: it never mutates the
 * config. It returns a list of issues; callers decide whether to reject or
 * safely repair.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

import type { ThemeConfig } from './types';
import { themeConfigSchema } from './schema';

/** The severity of a validation issue. */
export type ValidationSeverity = 'error' | 'warning';

/** A single validation issue. */
export interface ValidationIssue {
  /** The severity of the issue. */
  severity: ValidationSeverity;
  /** A stable machine-readable code. */
  code: string;
  /** A human-readable description. */
  message: string;
  /** The path to the offending value, when known. */
  path?: string;
}

/** The result of validating a ThemeConfig. */
export interface ThemeConfigValidationResult {
  /** Whether the config is valid (no errors). Warnings are allowed. */
  ok: boolean;
  /** All issues found (errors and warnings). */
  issues: ValidationIssue[];
  /** Only the error-severity issues. */
  errors: ValidationIssue[];
  /** Only the warning-severity issues. */
  warnings: ValidationIssue[];
}

/** A set of known-good values for a given category. */
export interface KnownValues {
  /** Known color palette ids. */
  colorPalettes?: string[];
  /** Known font pairing ids. */
  fontPairings?: string[];
  /** Known header layout ids. */
  headerTypes?: string[];
  /** Known hero layout ids. */
  heroTypes?: string[];
  /** Known button style ids. */
  buttonStyles?: string[];
}

/** Options for constructing a ThemeConfigValidator. */
export interface ThemeConfigValidatorOptions {
  /** Known-good values used to validate skin/skeleton/layout references. */
  known?: KnownValues;
}

/** A minimal menu item shape used during graph traversal. */
interface MenuItemLike {
  label: string;
  target: string;
  children?: MenuItemLike[];
}

/**
 * Validates a ThemeConfig for structural correctness, cross-reference
 * integrity, dead resources, circular references, and route/slug uniqueness.
 */
export class ThemeConfigValidator {
  private readonly known: KnownValues;

  constructor(options: ThemeConfigValidatorOptions = {}) {
    this.known = options.known ?? {};
  }

  /**
   * Validates a ThemeConfig. Returns a result with all issues found.
   */
  validate(config: unknown): ThemeConfigValidationResult {
    const issues: ValidationIssue[] = [];

    // 1. Structural validation via the Zod schema.
    const parsed = themeConfigSchema.safeParse(config);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
        issues.push({
          severity: 'error',
          code: 'schema',
          message: issue.message,
          path,
        });
      }
      return this.result(issues);
    }

    const data = parsed.data as ThemeConfig;

    // 2. Cross-reference + graph validation.
    this.validateIds(data, issues);
    this.validateRoutesAndSlugs(data, issues);
    this.validatePageSectionRefs(data, issues);
    this.validateSectionAssetFormRefs(data, issues);
    this.validateMenuPageRefs(data, issues);
    this.validateCircularReferences(data, issues);
    this.validateDeadResources(data, issues);
    this.validateSkinSkeleton(data, issues);

    return this.result(issues);
  }

  /** Builds the final result from a list of issues. */
  private result(issues: ValidationIssue[]): ThemeConfigValidationResult {
    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');
    return { ok: errors.length === 0, issues, errors, warnings };
  }

  /** Validates that ids are unique within each collection. */
  private validateIds(config: ThemeConfig, issues: ValidationIssue[]): void {
    const { pages, sections, assets, menus, forms } = config.resources;

    this.checkDuplicates(pages.map((p) => p.id), 'pages', 'page', issues);
    this.checkDuplicates(sections.map((s) => s.id), 'sections', 'section', issues);
    this.checkDuplicates(assets.map((a) => a.id), 'assets', 'asset', issues);
    this.checkDuplicates(menus.map((m) => m.id), 'menus', 'menu', issues);
    this.checkDuplicates(forms.map((f) => f.id), 'forms', 'form', issues);
  }

  /** Reports duplicate ids within a collection. */
  private checkDuplicates(
    ids: string[],
    collection: string,
    kind: string,
    issues: ValidationIssue[]
  ): void {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        issues.push({
          severity: 'error',
          code: 'duplicate_id',
          message: `Duplicate ${kind} id "${id}" in ${collection}`,
          path: `resources.${collection}`,
        });
      }
      seen.add(id);
    }
  }

  /**
   * Validates route format and case-insensitive duplicate slugs.
   */
  private validateRoutesAndSlugs(config: ThemeConfig, issues: ValidationIssue[]): void {
    const seenSlugs = new Map<string, string>(); // lowercased slug -> original route
    for (const page of config.resources.pages) {
      // Strict route format.
      if (!isValidRoute(page.route)) {
        issues.push({
          severity: 'error',
          code: 'invalid_route',
          message: `Invalid route "${page.route}" on page "${page.id}"`,
          path: `resources.pages.${page.id}.route`,
        });
      }

      // Case-insensitive duplicate slug detection.
      const slug = page.route.toLowerCase();
      const existing = seenSlugs.get(slug);
      if (existing !== undefined) {
        issues.push({
          severity: 'error',
          code: 'duplicate_slug',
          message: `Duplicate slug "${page.route}" collides with "${existing}" (case-insensitive)`,
          path: `resources.pages.${page.id}.route`,
        });
      } else {
        seenSlugs.set(slug, page.route);
      }
    }
  }

  /** Validates that every page -> section reference resolves. */
  private validatePageSectionRefs(config: ThemeConfig, issues: ValidationIssue[]): void {
    const sectionIds = new Set(config.resources.sections.map((s) => s.id));
    for (const page of config.resources.pages) {
      for (const ref of page.sectionIds) {
        if (!sectionIds.has(ref)) {
          issues.push({
            severity: 'error',
            code: 'invalid_section_ref',
            message: `Page "${page.id}" references missing section "${ref}"`,
            path: `resources.pages.${page.id}.sectionIds`,
          });
        }
      }
    }
  }

  /** Validates that every section -> asset/form reference resolves. */
  private validateSectionAssetFormRefs(config: ThemeConfig, issues: ValidationIssue[]): void {
    const assetIds = new Set(config.resources.assets.map((a) => a.id));
    const formIds = new Set(config.resources.forms.map((f) => f.id));
    for (const section of config.resources.sections) {
      for (const assetId of section.assetIds ?? []) {
        if (!assetIds.has(assetId)) {
          issues.push({
            severity: 'error',
            code: 'invalid_asset_ref',
            message: `Section "${section.id}" references missing asset "${assetId}"`,
            path: `resources.sections.${section.id}.assetIds`,
          });
        }
      }
      if (section.formId && !formIds.has(section.formId)) {
        issues.push({
          severity: 'error',
          code: 'invalid_form_ref',
          message: `Section "${section.id}" references missing form "${section.formId}"`,
          path: `resources.sections.${section.id}.formId`,
        });
      }
    }
  }

  /** Validates that every menu -> page reference resolves. */
  private validateMenuPageRefs(config: ThemeConfig, issues: ValidationIssue[]): void {
    const pageIds = new Set(config.resources.pages.map((p) => p.id));
    const walk = (items: MenuItemLike[], menuId: string): void => {
      for (const item of items) {
        const target = item.target;
        if (target.startsWith('page:')) {
          const pageId = target.slice('page:'.length);
          if (!pageIds.has(pageId)) {
            issues.push({
              severity: 'error',
              code: 'invalid_page_ref',
              message: `Menu "${menuId}" references missing page "${pageId}"`,
              path: `resources.menus.${menuId}`,
            });
          }
        }
        if (item.children && item.children.length > 0) {
          walk(item.children, menuId);
        }
      }
    };
    for (const menu of config.resources.menus) {
      walk(menu.items, menu.id);
    }
  }

  /**
   * Detects circular references using DFS. Menus form a directed graph through
   * their nested item trees; a cycle means an infinite routing loop.
   */
  private validateCircularReferences(config: ThemeConfig, issues: ValidationIssue[]): void {
    for (const menu of config.resources.menus) {
      this.detectMenuCycles(menu.items, menu.id, issues);
    }
  }


  /** DFS to detect cycles within a menu's nested item tree. */
  private detectMenuCycles(
    items: MenuItemLike[],
    menuId: string,
    issues: ValidationIssue[]
  ): void {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (node: MenuItemLike, path: string[]): void => {
      const key = node.label;
      if (visiting.has(key)) {
        issues.push({
          severity: 'error',
          code: 'circular_reference',
          message: `Circular menu reference detected in menu "${menuId}": ${[...path, key].join(' -> ')}`,
          path: `resources.menus.${menuId}`,
        });
        return;
      }
      if (visited.has(key)) {
        return;
      }
      visiting.add(key);
      for (const child of node.children ?? []) {
        dfs(child, [...path, key]);
      }
      visiting.delete(key);
      visited.add(key);
    };

    for (const item of items) {
      dfs(item, []);
    }
  }

  /**
   * Detects dead resources: orphan sections, unused pages, unused menus,
   * unused forms, unused assets.
   */
  private validateDeadResources(config: ThemeConfig, issues: ValidationIssue[]): void {
    const { pages, sections, assets, menus, forms } = config.resources;

    // Used section ids (referenced by pages).
    const usedSectionIds = new Set<string>();
    for (const page of pages) {
      for (const sectionId of page.sectionIds) {
        usedSectionIds.add(sectionId);
      }
    }
    for (const section of sections) {
      if (!usedSectionIds.has(section.id)) {
        issues.push({
          severity: 'warning',
          code: 'orphan_section',
          message: `Orphan section "${section.id}" is not referenced by any page`,
          path: `resources.sections.${section.id}`,
        });
      }
    }

    // Used page ids (referenced by menus).
    const usedPageIds = new Set<string>();
    for (const menu of menus) {
      const walk = (items: MenuItemLike[]): void => {
        for (const item of items) {
          if (item.target.startsWith('page:')) {
            usedPageIds.add(item.target.slice('page:'.length));
          }
          if (item.children && item.children.length > 0) {
            walk(item.children);
          }
        }
      };
      walk(menu.items);
    }
    for (const page of pages) {
      if (!page.isHome && !usedPageIds.has(page.id)) {
        issues.push({
          severity: 'warning',
          code: 'unused_page',
          message: `Unused page "${page.id}" is not referenced by any menu`,
          path: `resources.pages.${page.id}`,
        });
      }
    }

    // Used asset ids (referenced by sections or metadata).
    const usedAssetIds = new Set<string>();
    for (const section of sections) {
      for (const assetId of section.assetIds ?? []) {
        usedAssetIds.add(assetId);
      }
    }
    if (config.metadata.favicon) {
      usedAssetIds.add(config.metadata.favicon);
    }
    if (config.metadata.logo) {
      usedAssetIds.add(config.metadata.logo);
    }
    for (const asset of assets) {
      if (!usedAssetIds.has(asset.id)) {
        issues.push({
          severity: 'warning',
          code: 'unused_asset',
          message: `Unused asset "${asset.id}" is not referenced by any section`,
          path: `resources.assets.${asset.id}`,
        });
      }
    }

    // Used form ids (referenced by sections).
    const usedFormIds = new Set<string>();
    for (const section of sections) {
      if (section.formId) {
        usedFormIds.add(section.formId);
      }
    }
    for (const form of forms) {
      if (!usedFormIds.has(form.id)) {
        issues.push({
          severity: 'warning',
          code: 'unused_form',
          message: `Unused form "${form.id}" is not referenced by any section`,
          path: `resources.forms.${form.id}`,
        });
      }
    }

    // Unused menus (a menu is used if it is the primary navigation; we flag
    // menus with no items as dead).
    for (const menu of menus) {
      if (menu.items.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'unused_menu',
          message: `Menu "${menu.id}" has no items`,
          path: `resources.menus.${menu.id}`,
        });
      }
    }
  }

  /** Validates skin/skeleton/layout/color references against known values. */
  private validateSkinSkeleton(config: ThemeConfig, issues: ValidationIssue[]): void {
    const settings = config.resources.settings;
    const { skin, skeleton } = settings;

    if (skin) {
      this.checkKnown(skin.colorPalette, this.known.colorPalettes, 'colorPalette', 'skin', issues);
      this.checkKnown(skin.fontPairing, this.known.fontPairings, 'fontPairing', 'skin', issues);
      if (skin.buttonStyle) {
        this.checkKnown(skin.buttonStyle, this.known.buttonStyles, 'buttonStyle', 'skin', issues);
      }
    }

    if (skeleton) {
      this.checkKnown(skeleton.headerType, this.known.headerTypes, 'headerType', 'skeleton', issues);
      this.checkKnown(skeleton.heroType, this.known.heroTypes, 'heroType', 'skeleton', issues);
    }

    // Validate color values in settings.
    for (const key of ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor'] as const) {
      const value = settings[key];
      if (value && !isValidColor(value)) {
        issues.push({
          severity: 'warning',
          code: 'invalid_color',
          message: `Invalid color value "${value}" for settings.${key}`,
          path: `resources.settings.${key}`,
        });
      }
    }
  }

  /** Checks a value against a known-good set, emitting a warning when unknown. */
  private checkKnown(
    value: string,
    known: string[] | undefined,
    field: string,
    owner: string,
    issues: ValidationIssue[]
  ): void {
    if (known && known.length > 0 && !known.includes(value)) {
      issues.push({
        severity: 'warning',
        code: 'unknown_value',
        message: `Unknown ${field} "${value}" in ${owner}`,
        path: `resources.settings.${owner}.${field}`,
      });
    }
  }
}

/** A strict route validator: "/" or "/about" valid; "//home" or "abc" invalid. */
function isValidRoute(route: string): boolean {
  if (route === '/') {
    return true;
  }
  // Must start with a single "/", contain only lowercase letters, digits,
  // hyphens, and slashes, and not end with "/" (except root).
  return /^\/[a-z0-9]+(?:[-\/][a-z0-9]+)*$/.test(route);
}

/** A loose color validator (hex, rgb/rgba, or a CSS named color). */
function isValidColor(value: string): boolean {
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
    return true;
  }
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/.test(value)) {
    return true;
  }
  return /^[a-zA-Z]+$/.test(value);
}
