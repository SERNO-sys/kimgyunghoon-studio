/**
 * AWIE V2 - Text Component (Phase 09B, Mandate 2).
 *
 * A DUMB, semantic React presentation component. It renders a text block from
 * generic presentation props.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. SEMANTIC PROPS ONLY
 *      Uses `heading` and `body`. It NEVER uses page-specific names like
 *      `title` or `description`.
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
import type { TextProps } from './types';

/**
 * The Text component.
 *
 * Renders a text block with an optional heading and optional body copy. It is
 * intentionally DUMB: it only maps the semantic props to JSX.
 */
export function Text({ heading, body }: TextProps): React.ReactElement {
  return (
    <div className="awie-text">
      {heading ? <h2 className="awie-text__heading">{heading}</h2> : null}
      {body ? <p className="awie-text__body">{body}</p> : null}
    </div>
  );
}
