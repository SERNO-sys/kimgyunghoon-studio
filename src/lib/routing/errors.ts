/**
 * AWIE V2 - Routing Errors.
 *
 * Specific error classes mapped to HTTP concepts so adapters (Next.js,
 * Cloudflare Worker) can translate them into proper HTTP responses.
 *
 *   TenantNotFoundError      -> 404 Not Found
 *   SiteNotPublishedError    -> 403 Forbidden
 *   InvalidPreviewTokenError -> 401 Unauthorized
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure error modeling.
 */

/** The base class for all routing errors. */
export abstract class RoutingError extends Error {
  /** The HTTP status code this error maps to. */
  abstract readonly statusCode: number;
  /** A stable machine-readable error code. */
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Thrown when a host does not resolve to any tenant.
 *
 * Maps to HTTP 404 Not Found.
 */
export class TenantNotFoundError extends RoutingError {
  readonly statusCode = 404;
  readonly code = 'tenant_not_found';

  constructor(host: string) {
    super(`No tenant found for host "${host}".`);
  }
}

/**
 * Thrown when a site is not publicly routable (e.g. Draft/Review/Scheduled/
 * Archived) and no valid preview token was provided.
 *
 * Maps to HTTP 403 Forbidden.
 */
export class SiteNotPublishedError extends RoutingError {
  readonly statusCode = 403;
  readonly code = 'site_not_published';

  constructor(host: string, state: string) {
    super(`Site "${host}" is not published (state: ${state}).`);
  }
}

/**
 * Thrown when a preview token is missing, invalid, or expired.
 *
 * Maps to HTTP 401 Unauthorized.
 */
export class InvalidPreviewTokenError extends RoutingError {
  readonly statusCode = 401;
  readonly code = 'invalid_preview_token';

  constructor(reason: string) {
    super(`Invalid preview token: ${reason}.`);
  }
}
