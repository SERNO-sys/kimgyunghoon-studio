/**
 * AWIE V2 - MockProviderAdapter.
 *
 * The MockProviderAdapter is a dummy/generic provider adapter that demonstrates
 * how a concrete adapter adheres to the common ProviderAdapter contract. It
 * extends BaseProviderAdapter and implements ONLY the provider-specific
 * transport (`doGenerate` and `doStream`).
 *
 * It does NOT call a real provider. Instead it returns deterministic output so
 * the AI Engine and pipeline can be developed, tested, and reviewed before any
 * real provider SDK is integrated. It is also useful for tests and CI.
 *
 * STRICT CONSTRAINT: This adapter MUST NOT contain any business logic. It is
 * pure infrastructure and demonstrates the adapter contract only.
 */

import type {
  AIRequest,
  AIResponse,
  ProviderCapabilities,
  ProviderId,
  StreamChunk,
} from '../types';
import { BaseProviderAdapter } from './base';


/**
 * Options for the mock provider.
 */
export interface MockProviderOptions {
  /** The text to return for every generation. Defaults to a JSON echo. */
  responseText?: string;
  /** Simulated latency in milliseconds. Defaults to 0. */
  latencyMs?: number;
  /** Whether to simulate a failure. Defaults to false. */
  fail?: boolean;
  /** The error message to throw when `fail` is true. */
  failMessage?: string;
}

/**
 * A dummy provider adapter used for development, testing, and demonstrating the
 * ProviderAdapter contract. It never calls a real provider.
 */
export class MockProviderAdapter extends BaseProviderAdapter {
  private readonly options: MockProviderOptions;

  constructor(
    config: {
      provider: ProviderId;
      defaultModel: string;
      apiKey?: string;
      options?: MockProviderOptions;
    }
  ) {
    super(config.provider, {
      defaultModel: config.defaultModel,
      apiKey: config.apiKey,
      options: (config.options ?? {}) as Record<string, unknown>,
    });
    this.options = config.options ?? {};
  }


  /**
   * Reports the mock provider's capabilities. It supports both structured
   * output and streaming so it can exercise the full pipeline.
   */
  capabilities(): ProviderCapabilities {
    return {
      structuredOutput: true,
      streaming: true,
      models: [this.config.defaultModel],
      raw: { kind: 'mock' },
    };
  }

  /**
   * The mock provider is always available (it needs no real API key).
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Provider-specific generation. Returns a deterministic response, optionally
   * simulating latency or failure.
   */
  protected async doGenerate(request: AIRequest): Promise<AIResponse> {
    if (this.options.latencyMs) {
      await new Promise((resolve) => setTimeout(resolve, this.options.latencyMs));
    }

    if (this.options.fail) {
      throw new Error(this.options.failMessage ?? 'Mock provider simulated failure');
    }

    const text =
      this.options.responseText ??
      JSON.stringify({
        provider: this.provider,
        model: request.model,
        mode: request.mode,
        echo: (request.messages ?? []).map((m) => m.content).join('\n'),
      });


    return {
      text,
      provider: this.provider,
      model: request.model,
      usage: {
        inputTokens: 10,
        outputTokens: text.length,
        totalTokens: 10 + text.length,
      },
      raw: { kind: 'mock' },
    };
  }

  /**
   * Provider-specific streaming. Yields the response in chunks.
   */
  protected async *doStream(request: AIRequest): AsyncIterable<StreamChunk> {
    if (this.options.fail) {
      throw new Error(this.options.failMessage ?? 'Mock provider simulated failure');
    }

    const text =
      this.options.responseText ??
      JSON.stringify({
        provider: this.provider,
        model: request.model,
        mode: request.mode,
        echo: (request.messages ?? []).map((m) => m.content).join('\n'),
      });


    // Yield the text in small chunks to simulate a real stream.
    const chunkSize = 8;
    for (let i = 0; i < text.length; i += chunkSize) {
      yield {
        delta: text.slice(i, i + chunkSize),
        provider: this.provider,
        model: request.model,
      };
    }

    yield {
      delta: '',
      provider: this.provider,
      model: request.model,
      done: true,
    };
  }
}
