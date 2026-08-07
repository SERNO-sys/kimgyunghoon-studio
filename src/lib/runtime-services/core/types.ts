/**
 * AWIE V2 - Phase 11 M2: Runtime Coordination - Core Contract Types.
 *
 * This module defines the UNIVERSAL RuntimeService contract that every platform
 * runtime service MUST implement. It also defines the event-driven observability
 * primitives (RuntimeEvent, RuntimeEventBus) and the lifecycle-aware registry
 * contract.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - The core contract is pure infrastructure. It NEVER
 *      imports BusinessBrief, IndustryProfile, or RecipeBlueprint.
 *   2. ZERO RENDERING - The core contract NEVER renders UI.
 *   3. EVENT-DRIVEN OBSERVABILITY - Services MUST NOT print raw console logs.
 *      They emit RuntimeEvents on the RuntimeEventBus; diagnostics subscribe.
 *   4. DECOUPLING - Services MUST NOT depend directly on other services. They
 *      rely on context/registry lookups.
 *   5. LIFECYCLE - Every service has a deterministic lifecycle: initialize(),
 *      dispose(), and a health() probe.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure type modeling.
 */

// ---------------------------------------------------------------------------
// Service Health
// ---------------------------------------------------------------------------

/**
 * The health status of a runtime service.
 *
 *   - 'healthy'   - the service is fully operational.
 *   - 'degraded'  - the service is operational but impaired (e.g. a cache
 *                   backend is unavailable, so it falls back to no-op).
 *   - 'failed'    - the service is not operational.
 */
export type ServiceHealthStatus = 'healthy' | 'degraded' | 'failed';

// ---------------------------------------------------------------------------
// Service Scope & Metadata
// ---------------------------------------------------------------------------

/**
 * The lifecycle scope of a runtime service.
 *
 *   - 'singleton' - a single instance shared across the entire runtime
 *                   (global). E.g. the cache, the asset resolver.
 *   - 'scoped'    - a new instance per request/tenant scope. E.g. a per-request
 *                   localization context.
 *   - 'transient' - a new instance per resolution. E.g. a short-lived
 *                   analytics hook.
 *
 * The scope is DECLARATIVE metadata. It describes how the runtime should
 * resolve the service, but the service itself NEVER manages its own scope.
 */
export type ServiceScope = 'singleton' | 'scoped' | 'transient';

/**
 * The declarative metadata of a runtime service.
 *
 * Metadata is STATIC and IMMUTABLE. It describes WHAT the service is, its
 * version, its lifecycle scope, and its declared dependencies. It is used for
 * introspection, plugin-ecosystem readiness, and dependency resolution. It
 * NEVER contains runtime state.
 */
export interface ServiceMetadata {
  /** The stable, semantic service id (e.g. "asset-resolver"). */
  readonly id: string;
  /** The semantic version of the service (e.g. "1.0.0"). */
  readonly version: string;
  /** A human-readable description of the service's responsibility. */
  readonly description: string;
  /**
   * The lifecycle scope of the service.
   *
   *   - 'singleton' - global, shared instance.
   *   - 'scoped'    - per request/tenant instance.
   *   - 'transient' - per resolution instance.
   */
  readonly scope: ServiceScope;
  /** The ids of services this service depends on (empty if none). */
  readonly dependencies: readonly string[];
}


// ---------------------------------------------------------------------------
// Universal RuntimeService Contract
// ---------------------------------------------------------------------------

/**
 * The UNIVERSAL contract that every platform runtime service MUST implement.
 *
 * Every service is:
 *   - IDENTIFIED by a stable, semantic `id`.
 *   - DESCRIBED by immutable `getMetadata()`.
 *   - CAPABILITY-AWARE via `supports(capability)`.
 *   - LIFECYCLE-MANAGED via initialize() and dispose().
 *   - OBSERVABLE via health().
 *
 * The registry orchestrates bulk lifecycle and health aggregation across all
 * registered services. Services themselves NEVER orchestrate other services.
 */
export interface RuntimeService {
  /** The stable, semantic service id (e.g. "asset-resolver", "cache"). */
  readonly id: string;

  /**
   * Returns the immutable declarative metadata of the service.
   *
   * Metadata is used for introspection and plugin-ecosystem readiness. It MUST
   * be deterministic: the same service always returns the same metadata.
   */
  getMetadata(): ServiceMetadata;

  /**
   * Returns whether the service supports a given capability.
   *
   * Capability Discovery enables the runtime to query a service for a named
   * capability (e.g. "cache", "localization", "seo") without coupling to its
   * concrete type. The service itself decides which capabilities it exposes.
   *
   * @param capability The capability name to query.
   */
  supports(capability: string): boolean;

  /**
   * Initializes the service. Called once by the registry during bulk startup.
   *
   * Implementations MUST be idempotent: calling initialize() more than once
   * MUST NOT corrupt state.
   */
  initialize(): Promise<void>;

  /**
   * Disposes the service, releasing any resources. Called once by the registry
   * during graceful teardown.
   *
   * Implementations MUST be idempotent: calling dispose() more than once MUST
   * NOT throw.
   */
  dispose(): Promise<void>;

  /**
   * Returns the current health status of the service.
   */
  health(): ServiceHealthStatus;
}


// ---------------------------------------------------------------------------
// Runtime Events (Event-Driven Observability)
// ---------------------------------------------------------------------------

/**
 * The name of a runtime event.
 *
 * Events follow a `domain:action` convention, e.g.:
 *   - "service:initialized"
 *   - "service:disposed"
 *   - "cache:miss"
 *   - "cache:hit"
 *   - "seo:generated"
 *   - "asset:resolved"
 */
export type RuntimeEventName = string;

/**
 * A runtime event emitted by a service on the RuntimeEventBus.
 *
 * Services emit events for observability. Diagnostics (loggers, metrics,
 * tracing) subscribe to the bus. Services NEVER print raw console logs.
 */
export interface RuntimeEvent {
  /** The event name (e.g. "cache:miss"). */
  readonly name: RuntimeEventName;
  /** The id of the service that emitted the event. */
  readonly serviceId: string;
  /** The event timestamp (ISO-8601). */
  readonly timestamp: string;
  /** Optional event payload. */
  readonly payload?: Record<string, unknown>;
}

/**
 * A subscriber to runtime events.
 */
export type RuntimeEventSubscriber = (event: RuntimeEvent) => void;

/**
 * The RuntimeEventBus contract.
 *
 * A lightweight internal pub/sub for observability. Services emit events;
 * diagnostics subscribe. This decouples services from each other and from any
 * concrete logging/metrics provider.
 */
export interface RuntimeEventBus {
  /**
   * Emits an event to all subscribers.
   *
   * @param event The event to emit.
   */
  emit(event: RuntimeEvent): void;

  /**
   * Subscribes to events.
   *
   * @param subscriber The subscriber function.
   * @returns An unsubscribe function.
   */
  subscribe(subscriber: RuntimeEventSubscriber): () => void;

  /**
   * Removes all subscribers.
   */
  clear(): void;
}

// ---------------------------------------------------------------------------
// Lifecycle-Aware Runtime Service Registry
// ---------------------------------------------------------------------------

/**
 * The aggregated health of all registered services.
 */
export interface RuntimeHealthReport {
  /** The overall health status (worst of all services). */
  status: ServiceHealthStatus;
  /** The per-service health map, keyed by service id. */
  services: Readonly<Record<string, ServiceHealthStatus>>;
  /** The total number of registered services. */
  total: number;
  /** The number of healthy services. */
  healthy: number;
  /** The number of degraded services. */
  degraded: number;
  /** The number of failed services. */
  failed: number;
}

/**
 * The lifecycle-aware Runtime Service Registry contract.
 *
 * Backed by an O(1) Map (universal registry pattern). It orchestrates:
 *   - bulk initialization (initializeAll)
 *   - graceful teardown (disposeAll)
 *   - aggregated health (healthReport)
 *
 * The registry is PLATFORM INFRASTRUCTURE. It contains NO business logic.
 */
export interface RuntimeServiceRegistry {
  /**
   * Registers a service under its stable id.
   *
   * @param service The service to register.
   */
  register(service: RuntimeService): void;

  /**
   * Retrieves a service by id.
   *
   * @param id The stable service id.
   * @returns The service, or undefined if not registered.
   */
  get(id: string): RuntimeService | undefined;

  /**
   * Returns whether a service with the given id is registered.
   *
   * @param id The stable service id.
   */
  has(id: string): boolean;

  /**
   * Returns all registered services.
   */
  list(): RuntimeService[];

  /**
   * Initializes all registered services in registration order.
   *
   * If a service fails to initialize, its health is marked 'failed' and the
   * remaining services still initialize (fail-open, not fail-fast).
   */
  initializeAll(): Promise<void>;

  /**
   * Disposes all registered services in reverse registration order (graceful
   * teardown). Idempotent.
   */
  disposeAll(): Promise<void>;

  /**
   * Returns the aggregated health report across all registered services.
   */
  healthReport(): RuntimeHealthReport;

  /**
   * Freezes the registry. After this call, any register() attempt throws.
   */
  freeze(): void;

  /**
   * Returns whether the registry has been frozen.
   */
  isFrozen(): boolean;
}
