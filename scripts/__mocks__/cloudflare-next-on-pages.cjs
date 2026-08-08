/**
 * AWIE V2 - Test Stub for `@cloudflare/next-on-pages`.
 *
 * The real `@cloudflare/next-on-pages` package exposes its `"."` entry ONLY via
 * the `import` condition (no `require` condition). Plain `tsx` scripts run as
 * CommonJS, so importing the real package throws
 * `ERR_PACKAGE_PATH_NOT_EXPORTED`. This stub redirects that import to a
 * controllable `getRequestContext()` so the D1ProjectRepository constitutional
 * test can exercise the REAL D1 SQL path hermetically.
 *
 * This is a TEST-ONLY shim. It is never imported by application code.
 */

let requestContext = { env: {} };

/**
 * Returns the current request context (the Cloudflare Pages/Workers env).
 * Throws when no context has been set, matching the real package's behavior
 * outside a request.
 */
function getRequestContext() {
  if (!requestContext) {
    throw new Error('No request context available.');
  }
  return requestContext;
}

/**
 * TEST-ONLY: sets the request context returned by getRequestContext().
 * @param {object} ctx The request context, e.g. { env: { DB: mockD1 } }.
 */
function __setRequestContext(ctx) {
  requestContext = ctx;
}

module.exports = { getRequestContext, __setRequestContext };
