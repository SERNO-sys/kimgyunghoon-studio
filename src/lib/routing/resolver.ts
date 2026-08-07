/**
 * AWIE V2 - Domain Repository & Resolution.
 *
 * Enforces the Domain Model Rule:
 *
 *   Domain -> Tenant -> ThemeConfig
 *
 * A Domain maps to a Tenant, and a Tenant maps to a ThemeConfig. Domains are
 * NEVER mapped directly to ThemeConfigs. This indirection is what allows a
 * tenant to own multiple domains and to swap its active ThemeConfig without
 * touching domain records.
 *
 * CRITICAL CONSTRAINT: Resolution NEVER loads, parses, or validates the
 * ThemeConfig. It stops at returning the themeConfigId.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type {
  NormalizedHost,
  PreviewContext,
  PublicationState,
  TenantId,
  ThemeConfigId,
} from './types';
import { TenantNotFoundError } from './errors';

/**
 * A domain record. Maps a normalized host to a tenant.
 */
export interface DomainRecord {
  /** The normalized host (e.g. "example.com"). */
  host: NormalizedHost;
  /** The tenant that owns this domain. */
  tenantId: TenantId;
}

/**
 * A tenant record. Maps a tenant to its active ThemeConfig and publication
 * state.
 */
export interface TenantRecord {
  /** The tenant id. */
  id: TenantId;
  /** The active ThemeConfig id for this tenant. */
  themeConfigId: ThemeConfigId;
  /** The tenant's publication state. */
  publicationState: PublicationState;
  /** The tenant's default locale (e.g. "ko", "en"). */
  locale: string;
  /** The tenant's canonical host (used to build the canonical URL). */
  canonicalHost: NormalizedHost;
}

/**
 * The domain repository abstraction.
 *
 * Implementations may back this with a database, KV store, or in-memory map.
 * The pipeline depends only on this interface.
 */
export interface DomainRepository {
  /** Resolves a normalized host to a domain record, or undefined. */
  resolve(host: NormalizedHost): DomainRecord | undefined;
  /** Returns whether a normalized host exists. */
  exists(host: NormalizedHost): boolean;
  /** Loads a tenant record by id, or undefined. */
  loadTenant(tenantId: TenantId): TenantRecord | undefined;
  /** Loads a preview context for a tenant, or undefined. */
  loadPreview(tenantId: TenantId): PreviewContext | undefined;
}

/**
 * Resolves a normalized host to a tenant.
 *
 * Throws TenantNotFoundError (404) when the host does not exist.
 */
export class TenantResolver {
  constructor(private readonly repository: DomainRepository) {}

  /** Resolves a host to a tenant record. */
  resolve(host: NormalizedHost): TenantRecord {
    const domain = this.repository.resolve(host);
    if (!domain) {
      throw new TenantNotFoundError(host);
    }
    const tenant = this.repository.loadTenant(domain.tenantId);
    if (!tenant) {
      throw new TenantNotFoundError(host);
    }
    return tenant;
  }
}

/**
 * Resolves a preview context for a tenant.
 *
 * Returns undefined when no preview is configured for the tenant.
 */
export class PreviewResolver {
  constructor(private readonly repository: DomainRepository) {}

  /** Loads the preview context for a tenant, or undefined. */
  resolve(tenantId: TenantId): PreviewContext | undefined {
    return this.repository.loadPreview(tenantId);
  }
}

/**
 * Guards a tenant's publication state.
 *
 * A Published tenant is publicly routable. Any other state (Draft/Review/
 * Scheduled/Archived) requires a valid preview token.
 */
export class PublicationGuard {
  /** Whether a tenant is publicly routable. */
  isPubliclyRoutable(state: PublicationState): boolean {
    return state === 'published';
  }
}
