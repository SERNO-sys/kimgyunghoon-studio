/**
 * AWIE V2 - Routing Security.
 *
 * Handles preview token expiration tracking and forces the
 * `X-Robots-Tag: noindex, nofollow` header for any preview result so that
 * unpublished content is never indexed by search engines.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure security policy.
 */

import type { PreviewContext, Timestamp } from './types';
import { InvalidPreviewTokenError } from './errors';

/**
 * The header value forced on every preview response.
 *
 * `noindex` prevents indexing; `nofollow` prevents link following. Both are
 * required for unpublished content.
 */
export const PREVIEW_ROBOTS_HEADER = 'noindex, nofollow';

/** The header name used to signal robots policy. */
export const ROBOTS_HEADER_NAME = 'X-Robots-Tag';

/**
 * Checks whether a preview context is currently valid at the given time.
 *
 * A token is valid only while `issuedAt <= now <= expiresAt`.
 */
export function isPreviewValid(context: PreviewContext, now: Timestamp): boolean {
  const nowMs = Date.parse(now);
  const issuedMs = Date.parse(context.issuedAt);
  const expiresMs = Date.parse(context.expiresAt);

  if (Number.isNaN(nowMs) || Number.isNaN(issuedMs) || Number.isNaN(expiresMs)) {
    return false;
  }

  return nowMs >= issuedMs && nowMs <= expiresMs;
}

/**
 * Validates a preview context against a token and the current time.
 *
 * Throws InvalidPreviewTokenError when the token is missing, mismatched, or
 * expired. Returns the context when valid.
 */
export function assertPreviewValid(
  context: PreviewContext,
  providedToken: string | undefined,
  now: Timestamp,
): PreviewContext {
  if (!providedToken) {
    throw new InvalidPreviewTokenError('missing token');
  }
  if (providedToken !== context.token) {
    throw new InvalidPreviewTokenError('token mismatch');
  }
  if (!isPreviewValid(context, now)) {
    throw new InvalidPreviewTokenError('token expired');
  }
  return context;
}

/**
 * Builds the robots header value for a routing result.
 *
 * Any preview result MUST be `noindex, nofollow`. Non-preview (published)
 * results return undefined so the adapter may apply its own policy.
 */
export function robotsHeaderFor(isPreview: boolean): string | undefined {
  return isPreview ? PREVIEW_ROBOTS_HEADER : undefined;
}
