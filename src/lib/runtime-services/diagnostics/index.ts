/**
 * AWIE V2 - Phase 11 M2: Diagnostics Pipeline - barrel export.
 *
 * Diagnostics is about EXPLAINING the runtime, not just logging. It is a
 * layered pipeline:
 *
 *   Runtime Event -> Normalizer -> Structured Record -> SinkRegistry -> Sink
 *
 * Each layer is independent and replaceable. Future sinks (DatadogSink,
 * OTelSink) plug into the SinkRegistry seamlessly.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

// Contract types.
export type {
  DiagnosticLevel,
  DiagnosticRecord,
  DiagnosticsPipeline,
  Normalizer,
  Sink,
  SinkRegistry,
} from './types';

// Normalizer.
export { DefaultNormalizer } from './normalizer';

// SinkRegistry.
export { DefaultSinkRegistry } from './sink-registry';

// Sink.
export { StdoutSink } from './stdout-sink';

// DiagnosticsPipeline.
export { DefaultDiagnosticsPipeline } from './diagnostics-pipeline';
