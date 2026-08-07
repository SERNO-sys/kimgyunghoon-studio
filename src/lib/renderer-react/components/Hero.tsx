/**
 * AWIE V2 - Hero Component (Phase 09B, Mandate 2).
 *
 * A DUMB, semantic React presentation component. It renders a prominent,
 * full-width hero block from generic presentation props.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. SEMANTIC PROPS ONLY
 *      Uses `heading`, `body`, `media`, `actions`. It NEVER uses page-specific
 *      names like `title`, `imageUrl`, or `businessName`.
 *
 *   2. DUMB COMPONENT
 *      Knows NOTHING about ThemeConfig or SectionConfig. It receives plain,
 *      already-resolved presentation data and renders it. It does not
 *      interpret, validate, or transform business data.
 *
 *   3. NO BUSINESS LOGIC
 *      This component contains zero business logic. It is pure presentation.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure presentation infrastructure.
 */

import * as React from 'react';
import type { HeroProps } from './types';

/**
 * The Hero component.
 *
 * Renders a hero block with a heading, optional body copy, optional media, and
 * optional call-to-action actions. It is intentionally DUMB: it only maps the
 * semantic props to JSX.
 */
export function Hero({ heading, body, media, actions }: HeroProps): React.ReactElement {
  return (
    <section className="awie-hero">
      <div className="awie-hero__content">
        <h1 className="awie-hero__heading">{heading}</h1>
        {body ? <p className="awie-hero__body">{body}</p> : null}
        {actions && actions.length > 0 ? (
          <div className="awie-hero__actions">
            {actions.map((action, index) => (
              <a
                key={`${action.label}-${index}`}
                className={`awie-hero__action${action.variant ? ` awie-hero__action--${action.variant}` : ''}`}
                href={action.target}
              >
                {action.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
      {media ? (
        <div className="awie-hero__media">
          <img className="awie-hero__media-img" src={media.src} alt={media.alt ?? ''} />
        </div>
      ) : null}
    </section>
  );
}
