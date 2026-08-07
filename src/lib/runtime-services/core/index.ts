/**
 * AWIE V2 - Phase 11 M2: Runtime Coordination - Core barrel export.
 *
 * The core coordination primitives: the UNIVERSAL RuntimeService contract, the
 * RuntimeEventBus, the lifecycle-aware RuntimeServiceRegistry, and the shared
 * BaseService.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

// Core contract types.
export type {
  RuntimeEvent,
  RuntimeEventBus,
  RuntimeEventName,
  RuntimeEventSubscriber,
  RuntimeHealthReport,
  RuntimeService,
  RuntimeServiceRegistry,
  ServiceHealthStatus,
  ServiceScope,
} from './types';


// RuntimeEventBus.
export { DefaultRuntimeEventBus } from './event-bus';

// Lifecycle-aware RuntimeServiceRegistry.
export {
  DefaultRuntimeServiceRegistry,
  RuntimeServiceRegistryFrozenError,
} from './registry';

// Shared BaseService.
export { BaseService } from './base-service';
