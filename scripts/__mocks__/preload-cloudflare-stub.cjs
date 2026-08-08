/**
 * AWIE V2 - Test Preload Hook.
 *
 * Redirects the `@cloudflare/next-on-pages` import to the hermetic test stub
 * (`./cloudflare-next-on-pages.cjs`) so constitutional tests can run under
 * plain `tsx` (CommonJS) without the real package's `ERR_PACKAGE_PATH_NOT_EXPORTED`.
 *
 * Usage:
 *   node --import ./scripts/__mocks__/preload-cloudflare-stub.cjs --import tsx scripts/<test>.ts
 *
 * This is a TEST-ONLY shim. It is never imported by application code.
 */

const Module = require('module');
const path = require('path');

const STUB_PATH = path.join(__dirname, 'cloudflare-next-on-pages.cjs');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === '@cloudflare/next-on-pages') {
    return STUB_PATH;
  }
  return originalResolve.call(this, request, ...args);
};
