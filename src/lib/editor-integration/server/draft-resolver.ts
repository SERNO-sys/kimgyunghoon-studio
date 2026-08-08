/**
 * AWIE V2 - Phase I.3: Editor Integration - Draft ThemeConfig Resolver.
 *
 * THE SHARED RESOLVER FOR THE PUBLISH PIPELINE.
 *
 * This module is the SINGLE place that resolves the Draft ThemeConfig (the
 * working copy) for a Project/Site from durable storage (D1). It exists to
 * enforce the Phase I.3 architectural constraint:
 *
 *   "If ThemeConfig resolution is shared, extract it into a reusable resolver."
 *
 * Every publish entry point (admin Publish button, CMS publish route) MUST
 * resolve the Draft through THIS resolver — never re-implement the D1 read.
 * This guarantees that all entry points publish the SAME source of truth.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THEME CONFIG IS THE IMMUTABLE SSOT (ADR-003)
 *      The ThemeConfig persisted on the Site row in D1 is the single source of
 *      truth. This resolver reads it and returns it UNCHANGED. It NEVER mutates
 *      the ThemeConfig and NEVER re-composes it.
 *
 *   2. SERVER-SIDE ONLY
 *      This module MUST NEVER be imported by the client. It is pure server-side
 *      infrastructure for the integration layer.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side infrastructure for the integration layer.
 */

import type { Db } from '../../db/types';
import type { ThemeConfig } from '../../theme-config/v2/types';
import { getSiteById } from '../../db/queries';

/**
 * Resolves the Draft ThemeConfig for a Site from durable storage (D1).
 *
 * Reads the Site row and returns its persisted ThemeConfig UNCHANGED. Returns
 * `undefined` if the Site does not exist or has no ThemeConfig yet.
 *
 * TYPE BOUNDARY: The persisted `Site.themeConfig` column is typed with the
 * legacy design-system ThemeConfig shape (src/types/site.ts). The Publish
 * pipeline consumes the v2 ThemeConfig (src/lib/theme-config/v2/types.ts) as
 * the immutable SSOT. This resolver is a THIN READ ADAPTER: it does NOT
 * transform, migrate, or re-compose the persisted value — it returns the
 * persisted SSOT as-is, typed as the v2 ThemeConfig that the pipeline consumes.
 * Any schema migration is the responsibility of the ThemeConfig migration
 * layer, never this resolver.
 *
 * @param db The D1 database handle.
 * @param siteId The id of the Site (Project) to resolve the Draft for.
 * @returns The immutable Draft ThemeConfig, or undefined if unavailable.
 */
export async function resolveDraftThemeConfig(
  db: Db,
  siteId: string,
): Promise<ThemeConfig | undefined> {
  const site = await getSiteById(db, siteId);
  if (!site) {
    return undefined;
  }
  return site.themeConfig as ThemeConfig | undefined;
}


