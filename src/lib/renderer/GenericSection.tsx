/**
 * AWIE V2 - GenericSection (Fallback).
 *
 * When the engine requests a section type that is not registered, it MUST
 * resolve to GenericSection. This fallback:
 *
 *   1. Preserves layout spacing so the site structure does not collapse.
 *   2. Emits an UNKNOWN_SECTION_TYPE telemetry event.
 *
 * CRITICAL SAFETY RULE: GenericSection MUST NEVER expose raw JSON configuration
 * in a production environment. The raw JSON block is shown ONLY in development.
 * In production, a safe, empty placeholder is rendered that strictly preserves
 * layout spacing.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 *
 * CLIENT COMPONENT: This module exports a React component. It MUST be a Client
 * Component so it can be rendered by the Client RenderEngine. Client Components
 * are still server-rendered for the initial HTML, so the Edge runtime and SSR
 * output are preserved.
 */
'use client';

import * as React from 'react';

import type { SectionProps } from './types';
import { RendererTelemetryEventType } from './types';

/** Whether we are in a development environment. */
const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * The generic fallback section component.
 *
 * Renders a full-width container with the section's configured padding (or a
 * sensible default) so the page layout does not collapse when a section type
 * is unknown. Emits an UNKNOWN_SECTION_TYPE telemetry event on mount.
 *
 * In development, the raw section content is shown as a JSON block for
 * debugging. In production, a safe, empty placeholder is rendered instead.
 */
export function GenericSection({ section, theme, context }: SectionProps): React.ReactElement {
  // Emit telemetry for the unknown section type. Telemetry must never throw.
  try {
    context.telemetry.record({
      type: RendererTelemetryEventType.UNKNOWN_SECTION_TYPE,
      timestamp: new Date().toISOString(),
      metadata: {
        sectionId: section.id,
        sectionType: section.type,
        route: context.route,
      },
    });
  } catch {
    // Telemetry failures must not break rendering.
  }

  const padding = section.settings?.padding ?? theme.spacing.lg;
  const maxWidth = section.settings?.maxWidth ?? '1200px';
  const backgroundColor = section.settings?.backgroundColor ?? theme.colors.background;

  const style: React.CSSProperties = {
    padding,
    maxWidth,
    margin: '0 auto',
    backgroundColor,
    boxSizing: 'border-box',
  };

  return (
    <section
      data-awie-section={section.id}
      data-awie-type={section.type}
      data-awie-fallback="true"
      style={style}
    >
      {IS_DEV ? (
        // Development only: expose the raw config for debugging.
        <pre
          data-awie-fallback-debug="true"
          style={{
            margin: 0,
            padding: theme.spacing.sm,
            fontSize: '0.75rem',
            color: theme.colors.text,
            backgroundColor: theme.colors.background,
            border: `1px dashed ${theme.colors.primary}`,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {JSON.stringify(section, null, 2)}
        </pre>
      ) : (
        // Production: safe, empty placeholder that preserves layout spacing.
        <div style={{ minHeight: '1px' }} aria-hidden="true" />
      )}
    </section>
  );
}
