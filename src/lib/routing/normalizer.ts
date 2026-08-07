/**
 * AWIE V2 - Host Normalizer.
 *
 * Normalizes a raw host header into a canonical, lowercase hostname with no
 * port and no "www." prefix. Hostnames MUST be normalized BEFORE tenant
 * resolution so that lookups are deterministic.
 *
 * Examples:
 *   "WWW.EXAMPLE.COM:443" -> "example.com"
 *   "Example.com"         -> "example.com"
 *   "www.example.com"     -> "example.com"
 *   "sub.example.com"     -> "sub.example.com"
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure string transformation.
 */

import type { NormalizedHost } from './types';

/**
 * Normalizes a raw host header.
 *
 * Steps:
 *   1. Trim whitespace.
 *   2. Strip any port suffix (e.g. ":443", ":8080").
 *   3. Lowercase the hostname.
 *   4. Remove a leading "www." prefix.
 *
 * Returns the normalized hostname. If the input is empty, returns an empty
 * string (the caller is responsible for rejecting it).
 */
export function normalizeHost(rawHost: string): NormalizedHost {
  let host = rawHost.trim();

  // Strip the port suffix (IPv4-style ":port").
  const colonIndex = host.lastIndexOf(':');
  if (colonIndex > -1) {
    // Only strip if the part after the colon is numeric (a port), not an IPv6
    // address. For simplicity, treat a trailing numeric segment as a port.
    const afterColon = host.slice(colonIndex + 1);
    if (/^\d+$/.test(afterColon)) {
      host = host.slice(0, colonIndex);
    }
  }

  // Lowercase.
  host = host.toLowerCase();

  // Remove a single leading "www." prefix.
  if (host.startsWith('www.')) {
    host = host.slice(4);
  }

  return host;
}

/**
 * A convenience class wrapper around normalizeHost for dependency injection
 * and testability.
 */
export class HostNormalizer {
  /** Normalizes a raw host header. */
  normalize(rawHost: string): NormalizedHost {
    return normalizeHost(rawHost);
  }
}
