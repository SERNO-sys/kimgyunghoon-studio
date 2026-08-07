/**
 * AWIE V2 - Phase 11: Security Services.
 *
 * The Security service is a PLATFORM SERVICE that provides security primitives:
 * HTML sanitization, Content Security Policy generation, and safe URL
 * validation. It protects the runtime.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * The Security service is the EXECUTION layer. It:
 *   1. PROTECTS - enforces security policies.
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - It NEVER imports BusinessBrief, IndustryProfile,
 *      or RecipeBlueprint. It operates ONLY on opaque strings and policies.
 *   2. ZERO RENDERING - It NEVER renders UI. It only sanitizes and validates.
 *   3. DETERMINISM - Same input -> same output. No randomness.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import { BaseService } from './core';
import type { RuntimeEventBus } from './core';
import type { ContentSecurityPolicy, SecurityService } from './types';

/**
 * The default Security service.
 *
 * Provides:
 *   - sanitizeHtml: removes dangerous HTML (script tags, event handlers,
 *     javascript: URLs).
 *   - buildCsp: builds a Content Security Policy header value from a directive
 *     set.
 *   - isSafeUrl: validates that a URL is http/https only.
 *
 * The service is deterministic: the same input always produces the same output.
 *
 * It implements the UNIVERSAL RuntimeService contract (lifecycle + health) and
 * emits "security:sanitized" events on the RuntimeEventBus for observability.
 */
export class DefaultSecurity extends BaseService implements SecurityService {
  /** The stable service id. */
  readonly id = 'security' as const;

  /**
   * Constructs a DefaultSecurity.
   *
   * @param bus The optional RuntimeEventBus for observability.
   */
  constructor(bus?: RuntimeEventBus) {
    super(bus);
  }

  /**
   * Sanitizes an HTML string, removing dangerous content.
   *
   * Removes:
   *   - <script> tags and their contents.
   *   - on* event handler attributes.
   *   - javascript: URLs in href/src.
   *
   * @param html The raw HTML string.
   * @returns The sanitized HTML string.
   */
  sanitizeHtml(html: string): string {
    let result = html;
    // Remove <script>...</script> blocks (with or without attributes).
    result = result.replace(/<script[\s\S]*?<\/script>/gi, '');
    // Remove <script ... /> self-closing tags.
    result = result.replace(/<script[^>]*\/>/gi, '');
    // Remove on* event handler attributes.
    result = result.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    // Remove javascript: URLs in href/src attributes.
    result = result.replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2');
    this.emit('security:sanitized', { inputLength: html.length });
    return result;
  }


  /**
   * Builds a Content Security Policy header value.
   *
   * @param csp The CSP directive set.
   * @returns The CSP header value string.
   */
  buildCsp(csp: ContentSecurityPolicy): string {
    const directives: string[] = [];

    if (csp.defaultSrc) {
      directives.push(`default-src ${csp.defaultSrc.join(' ')}`);
    }
    if (csp.scriptSrc) {
      directives.push(`script-src ${csp.scriptSrc.join(' ')}`);
    }
    if (csp.styleSrc) {
      directives.push(`style-src ${csp.styleSrc.join(' ')}`);
    }
    if (csp.imgSrc) {
      directives.push(`img-src ${csp.imgSrc.join(' ')}`);
    }
    if (csp.connectSrc) {
      directives.push(`connect-src ${csp.connectSrc.join(' ')}`);
    }
    if (csp.fontSrc) {
      directives.push(`font-src ${csp.fontSrc.join(' ')}`);
    }
    if (csp.frameAncestors) {
      directives.push(`frame-ancestors ${csp.frameAncestors.join(' ')}`);
    }

    return directives.join('; ');
  }

  /**
   * Validates that a URL is safe (http/https only, no javascript:).
   *
   * @param url The URL to validate.
   * @returns True if the URL is safe.
   */
  isSafeUrl(url: string): boolean {
    const trimmed = url.trim().toLowerCase();
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('#')
    );
  }
}
