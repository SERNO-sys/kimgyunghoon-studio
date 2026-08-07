/**
 * AWIE V2 - Phase 11 M2: Runtime Coordination - BaseService.
 *
 * A shared base class that implements the UNIVERSAL RuntimeService lifecycle
 * contract (initialize/dispose/health) and event-driven observability. Every
 * concrete runtime service extends this base to inherit:
 *   - idempotent initialize()/dispose()
 *   - health() tracking
 *   - event emission on the RuntimeEventBus (no raw console logs)
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. EVENT-DRIVEN OBSERVABILITY - Services emit RuntimeEvents on the bus.
 *      They NEVER print raw console logs.
 *   2. DECOUPLING - Services emit events; they do not depend on subscribers.
 *   3. ZERO BUSINESS LOGIC - The base is pure infrastructure.
 *   4. ZERO RENDERING - The base NEVER renders UI.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type {
  RuntimeEvent,
  RuntimeEventBus,
  RuntimeService,
  ServiceHealthStatus,
  ServiceMetadata,
} from './types';

/**
 * The shared base class for all runtime services.
 *
 * Subclasses MUST provide a stable `id` and MAY override `onInitialize()` and
 * `onDispose()` to perform service-specific lifecycle work. The base handles
 * idempotency, health tracking, event emission, metadata, and capability
 * discovery.
 *
 * Subclasses SHOULD override `metadata` (declarative description) and
 * `capabilities` (the set of capabilities the service exposes) to participate
 * in the plugin ecosystem.
 */
export abstract class BaseService implements RuntimeService {
  /** The stable, semantic service id. */
  abstract readonly id: string;

  /**
   * The declarative metadata of the service.
   *
   * Subclasses SHOULD override this to describe their responsibility, version,
   * lifecycle scope, and dependencies. The default derives the id and version
   * from the class and defaults the scope to 'singleton'.
   */
  protected get metadata(): ServiceMetadata {
    return {
      id: this.id,
      version: '1.0.0',
      description: `Runtime service "${this.id}".`,
      scope: 'singleton',
      dependencies: [],
    };
  }


  /**
   * The set of capabilities this service exposes.
   *
   * Subclasses SHOULD override this to declare their capabilities (e.g.
   * "cache", "localization", "seo"). The default exposes the service id itself
   * as a capability.
   */
  protected get capabilities(): ReadonlySet<string> {
    return new Set([this.id]);
  }

  /** The optional RuntimeEventBus for observability. */
  protected readonly bus?: RuntimeEventBus;

  /** The current health status. */
  private status: ServiceHealthStatus = 'healthy';

  /** Whether the service has been initialized. */
  private initialized = false;

  /** Whether the service has been disposed. */
  private disposed = false;

  /**
   * Constructs a BaseService.
   *
   * @param bus The optional RuntimeEventBus for observability.
   */
  constructor(bus?: RuntimeEventBus) {
    this.bus = bus;
  }

  /**
   * Returns the immutable declarative metadata of the service.
   */
  getMetadata(): ServiceMetadata {
    return this.metadata;
  }

  /**
   * Returns whether the service supports a given capability.
   *
   * @param capability The capability name to query.
   */
  supports(capability: string): boolean {
    return this.capabilities.has(capability);
  }


  /**
   * Initializes the service. Idempotent.
   *
   * Emits "service:initialized" on success. If onInitialize() throws, the
   * health is marked 'failed' and the error is re-thrown.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await this.onInitialize();
      this.initialized = true;
      this.status = 'healthy';
      this.emit('service:initialized');
    } catch (error) {
      this.status = 'failed';
      this.emit('service:initialize-failed', { error: String(error) });
      throw error;
    }
  }

  /**
   * Disposes the service. Idempotent.
   *
   * Emits "service:disposed". If onDispose() throws, the health is marked
   * 'failed' and the error is re-thrown.
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    try {
      await this.onDispose();
      this.disposed = true;
      this.status = 'healthy';
      this.emit('service:disposed');
    } catch (error) {
      this.status = 'failed';
      this.emit('service:dispose-failed', { error: String(error) });
      throw error;
    }
  }

  /**
   * Returns the current health status.
   */
  health(): ServiceHealthStatus {
    return this.status;
  }

  /**
   * Marks the service as degraded. Used by subclasses when a non-fatal
   * impairment is detected (e.g. a cache backend is unavailable).
   */
  protected markDegraded(): void {
    this.status = 'degraded';
  }

  /**
   * Emits a runtime event on the bus (if one is present).
   *
   * @param name The event name.
   * @param payload Optional event payload.
   */
  protected emit(name: string, payload?: Record<string, unknown>): void {
    if (!this.bus) {
      return;
    }
    const event: RuntimeEvent = {
      name,
      serviceId: this.id,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.bus.emit(event);
  }

  /**
   * Service-specific initialization. Subclasses MAY override.
   */
  protected async onInitialize(): Promise<void> {
    // No-op by default.
  }

  /**
   * Service-specific disposal. Subclasses MAY override.
   */
  protected async onDispose(): Promise<void> {
    // No-op by default.
  }
}
