/**
 * AWIE V2 - Product Development Phase: Shared Product Scaffold.
 *
 * A pure helper for authoring Reference Products ON TOP of the frozen AWIE V2
 * Engine. It builds a valid ThemeConfig (the SSOT) from a compact product
 * declaration.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   This module is a PRODUCT-AUTHORING TOOL. It does NOT modify the frozen
 *   engine, SDK, or CLI. It only constructs ThemeConfig data (the SSOT) that
 *   the frozen Golden Path orchestrator renders. It contains NO business logic
 *   and NO rendering — it is pure data construction.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure data-construction helper for the Developer Platform.
 */

import type { ThemeConfig } from '../../src/lib/theme-config/v2/types';

/**
 * The compact declaration of a Reference Product.
 *
 * A product is described by its identity, its intent, its pages (each with
 * ordered sections), its flat asset registry, its global settings, its menus,
 * and its forms. This is the "product brief" that the AI would resolve into a
 * full ThemeConfig.
 */
export interface ProductDeclaration {
  /** The product id (e.g. "flower-shop"). */
  readonly id: string;
  /** The site title. */
  readonly title: string;
  /** The site tagline. */
  readonly tagline?: string;
  /** The site description (SEO). */
  readonly description?: string;
  /** The primary locale. */
  readonly locale?: string;
  /** The canonical domain. */
  readonly domain?: string;
  /** The business intent. */
  readonly intent: ThemeConfig['intent'];
  /** The analyzed industry (for the AI design report). */
  readonly industry: string;
  /** The AI design reasoning. */
  readonly reasoning: string;
  /** The global site settings. */
  readonly settings: ThemeConfig['resources']['settings'];
  /** The pages, each with ordered section declarations. */
  readonly pages: ReadonlyArray<{
    readonly id: string;
    readonly route: string;
    readonly title: string;
    readonly description?: string;
    readonly isHome?: boolean;
    readonly hidden?: boolean;
    readonly sections: ReadonlyArray<{
      readonly id: string;
      readonly type: string;
      readonly content: Record<string, unknown>;
      readonly assetIds?: string[];
      readonly formId?: string;
      readonly settings?: Record<string, unknown>;
    }>;
  }>;
  /** The flat asset registry. */
  readonly assets: ReadonlyArray<{
    readonly id: string;
    readonly url: string;
    readonly mimeType?: string;
    readonly width?: number;
    readonly height?: number;
    readonly alt?: string;
  }>;
  /** The navigation menus. */
  readonly menus: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly items: ReadonlyArray<{
      readonly label: string;
      readonly target: string;
      readonly children?: ReadonlyArray<{ readonly label: string; readonly target: string }>;
    }>;
  }>;
  /** The forms. */
  readonly forms: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly submitTo?: string;
    readonly fields: ReadonlyArray<{
      readonly name: string;
      readonly label: string;
      readonly type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox';
      readonly required?: boolean;
      readonly placeholder?: string;
      readonly options?: string[];
    }>;
  }>;
}

/**
 * Builds a complete, valid ThemeConfig (the SSOT) from a ProductDeclaration.
 *
 * This is the deterministic resolution of a product brief into the immutable
 * SSOT that the frozen Golden Path renders. It is pure data construction.
 *
 * @param declaration The product declaration.
 * @returns A complete ThemeConfig ready for validation + rendering.
 */
export function buildProductConfig(declaration: ProductDeclaration): ThemeConfig {
  const now = '2026-08-06T00:00:00.000Z';

  return {
    metadata: {
      title: declaration.title,
      tagline: declaration.tagline,
      description: declaration.description,
      locale: declaration.locale ?? 'en',
      domain: declaration.domain,
      createdAt: now,
      updatedAt: now,
      generator: 'awie-product-scaffold',
      generatorVersion: '2.0.0',
    },
    intent: declaration.intent,
    resources: {
      pages: declaration.pages.map((page) => ({
        id: page.id,
        route: page.route,
        title: page.title,
        description: page.description,
        sectionIds: page.sections.map((s) => s.id),
        isHome: page.isHome,
        hidden: page.hidden,
      })),
      sections: declaration.pages.flatMap((page) =>
        page.sections.map((section) => ({
          id: section.id,
          type: section.type as ThemeConfig['resources']['sections'][number]['type'],
          content: section.content,
          assetIds: section.assetIds,
          formId: section.formId,
          settings: section.settings,
        })),
      ),
      assets: declaration.assets.map((asset) => ({
        id: asset.id,
        url: asset.url,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        alt: asset.alt,
      })),
      settings: {
        ...declaration.settings,
        aiDesignReport: {
          analyzedIndustry: declaration.industry,
          reasoning: declaration.reasoning,
        },
      },
      menus: declaration.menus.map((menu) => ({
        id: menu.id,
        label: menu.label,
        items: menu.items.map((item) => ({
          label: item.label,
          target: item.target,
          children: item.children?.map((child) => ({ label: child.label, target: child.target })),
        })),
      })),
      forms: declaration.forms.map((form) => ({
        id: form.id,
        title: form.title,
        submitTo: form.submitTo,
        fields: form.fields.map((field) => ({
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required,
          placeholder: field.placeholder,
          options: field.options,
        })),
      })),
    },
    policies: {},
  };
}
