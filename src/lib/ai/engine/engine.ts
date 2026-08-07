import type { ZodType } from 'zod';
import { estimateCostUsd, resolveModel } from './models';
import { parseJsonResponse } from './sanitize';
import { DEFAULT_RETRY_POLICY, withRetry } from './retry';
import type {
  AiProvider,
  AiProviderId,
  CostEstimate,
  GenerateOptions,
  GenerateStructuredResult,
  GenerateTextResult,
  RetryPolicy,
  TelemetryHooks,
  TokenUsage,
} from './types';

/**
 * AiEngine — the single entry point for all AI generation in AWIE.
 *
 * Responsibilities:
 *  - provider selection (provider-agnostic; adapters injected at construction)
 *  - retry with exponential backoff for transient failures
 *  - ONE sanitizer + ONE parser + ONE validation layer for structured output
 *  - token usage and cost accounting on every result
 *  - telemetry hooks for observability
 *
 * Business logic (quotas, ownership, persistence) stays in routes/services —
 * the engine is pure infrastructure.
 */
export class AiEngine {
  constructor(
    private readonly providers: Partial<Record<AiProviderId, AiProvider>>,
    private readonly telemetry: TelemetryHooks = {}
  ) {}

  private resolveProvider(preferred: AiProviderId): AiProvider {
    const provider = this.providers[preferred];
    if (provider?.isConfigured()) return provider;
    const mock = this.providers.mock;
    if (mock) return mock;
    throw new Error(`AI provider '${preferred}' is not configured`);
  }

  /** Generates plain text. */
  async generateText(options: GenerateOptions): Promise<GenerateTextResult> {
    const modelInfo = resolveModel(options.model);
    const provider = this.resolveProvider(modelInfo.provider);
    const policy: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...options.retry };
    const base = {
      flow: options.flow,
      provider: provider.id,
      model: modelInfo.model,
      promptVersion: options.promptVersion,
    };

    this.telemetry.onRequest?.(base);
    const startedAt = Date.now();

    try {
      const { result, attempts } = await withRetry(
        () =>
          provider.generate({
            model: modelInfo.model,
            system: options.system,
            prompt: options.prompt,
            temperature: options.temperature,
            maxOutputTokens: options.maxOutputTokens,
          }),
        policy,
        (attempt, error) =>
          this.telemetry.onRetry?.({
            ...base,
            attempt,
            error: error instanceof Error ? error.message : String(error),
          })
      );

      const latencyMs = Date.now() - startedAt;
      const cost = this.toCost(modelInfo.model, result.usage, options.model);
      this.telemetry.onResponse?.({ ...base, latencyMs, attempts, usage: result.usage, cost });

      return {
        text: result.text,
        usage: result.usage,
        cost,
        provider: provider.id,
        model: modelInfo.model,
        latencyMs,
        attempts,
      };
    } catch (error) {
      this.telemetry.onError?.({
        ...base,
        error: error instanceof Error ? error.message : String(error),
        attempts: policy.maxAttempts,
      });
      throw error;
    }
  }

  /**
   * Generates structured output validated against a Zod schema.
   *
   * Never throws for content-level problems: parsing/validation failures are
   * reported in the result (`ok: false`) so callers decide their own fallback
   * policy. Infrastructure failures (provider down after retries) still throw.
   */
  async generateStructured<T>(
    schema: ZodType<T>,
    options: GenerateOptions
  ): Promise<GenerateStructuredResult<T>> {
    const result = await this.generateText(options);
    const { text, ...meta } = result;

    if (!text.trim()) {
      return { ok: false, reason: 'empty_response', raw: text, ...meta };
    }

    const parsed = parseJsonResponse(text);
    if (parsed === null) {
      return { ok: false, reason: 'invalid_json', raw: text, ...meta };
    }

    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        reason: 'schema_mismatch',
        issues: validated.error.issues.map(
          (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`
        ),
        raw: text,
        ...meta,
      };
    }

    return { ok: true, data: validated.data, raw: text, ...meta };
  }

  /** Streams plain text chunks. */
  async *generateStream(options: GenerateOptions): AsyncIterable<string> {
    const modelInfo = resolveModel(options.model);
    const provider = this.resolveProvider(modelInfo.provider);
    this.telemetry.onRequest?.({
      flow: options.flow,
      provider: provider.id,
      model: modelInfo.model,
      promptVersion: options.promptVersion,
    });
    yield* provider.generateStream({
      model: modelInfo.model,
      system: options.system,
      prompt: options.prompt,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
    });
  }

  private toCost(model: string, usage: TokenUsage, modelKey?: string): CostEstimate {
    const info = resolveModel(modelKey);
    return {
      usd: info.model === model ? estimateCostUsd(info, usage.inputTokens, usage.outputTokens) : 0,
      usage,
    };
  }
}
