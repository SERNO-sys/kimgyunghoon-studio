/**
 * AWIE V2 - Routing barrel export.
 *
 * The routing layer is the entry point of the multi-site SaaS platform. It
 * resolves an incoming host to a Tenant, and a Tenant to a ThemeConfig —
 * WITHOUT ever loading, parsing, or validating the ThemeConfig.
 *
 *   Domain -> Tenant -> ThemeConfig
 */
export {
  PublicationState,
  type NormalizedHost,
  type PostResolveHook,
  type PreResolveHook,
  type PreviewContext,
  type PublicationState as PublicationStateType,
  type RoutingCache,
  type RoutingPlugin,
  type RoutingRequest,
  type RoutingResult,
  type TenantId,
  type ThemeConfigId,
  type Timestamp,
} from './types';

export { HostNormalizer, normalizeHost } from './normalizer';

export {
  InvalidPreviewTokenError,
  RoutingError,
  SiteNotPublishedError,
  TenantNotFoundError,
} from './errors';

export {
  PreviewResolver,
  PublicationGuard,
  TenantResolver,
  type DomainRecord,
  type DomainRepository,
  type TenantRecord,
} from './resolver';

export {
  PREVIEW_ROBOTS_HEADER,
  ROBOTS_HEADER_NAME,
  assertPreviewValid,
  isPreviewValid,
  robotsHeaderFor,
} from './security';

export {
  RoutingPipeline,
  buildCanonicalUrl,
  type RoutingPipelineOptions,
} from './pipeline';
