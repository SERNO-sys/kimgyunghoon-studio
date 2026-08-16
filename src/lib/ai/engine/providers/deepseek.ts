import { getEnv } from '@/config/env';
import type { AiProvider, ProviderRequest, ProviderResponse, TokenUsage } from '../types';

/**
 * DeepSeek provider adapter.
 *
 * DeepSeek exposes an OpenAI-compatible Chat Completions API, so this adapter
 * talks to it over plain `fetch` (no extra SDK dependency). It is the ONLY
 * file in the AI Engine allowed to know DeepSeek's HTTP contract.
 *
 * Error classification mirrors the engine's retry policy:
 *  - transient (429 / 5xx / network) -> thrown so `withRetry` retries
 *  - deterministic (400/401/403/404) -> thrown immediately, never retried
 */
export class DeepSeekProvider implements AiProvider {
  readonly id = 'deepseek' as const;

  private readonly baseUrl = 'https://api.deepseek.com/chat/completions';

  private getApiKey(): string | null {
    const { DEEPSEEK_API_KEY } = getEnv();
    return DEEPSEEK_API_KEY || null;
  }

  isConfigured(): boolean {
    return this.getApiKey() !== null;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('DeepSeek API key is not configured');
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (request.system) {
      messages.push({ role: 'system', content: request.system });
    }
    messages.push({ role: 'user', content: request.prompt });

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      stream: false,
    };
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.maxOutputTokens !== undefined) {
      body.max_tokens = request.maxOutputTokens;
    }

    let response: Response;
    try {
      response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      // Network-level failure (DNS, connection reset, timeout) is transient.
      throw new Error(`DeepSeek network error: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const message = `DeepSeek API error ${response.status}: ${detail}`;
      // 429 and 5xx are transient; 4xx (except 429) are deterministic.
      if (response.status === 429 || response.status >= 500) {
        throw new Error(message);
      }
      throw new Error(message);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const text = data.choices?.[0]?.message?.content ?? '';
    return {
      text,
      usage: toUsage(data.usage),
    };
  }

  async *generateStream(request: ProviderRequest): AsyncIterable<string> {
    // Streaming is not used by the copywriter flows; fall back to a single
    // non-streaming generation so the interface contract is always satisfied.
    const { text } = await this.generate(request);
    if (text) yield text;
  }
}

function toUsage(usage?: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}): TokenUsage {
  const inputTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage?.total_tokens ?? inputTokens + outputTokens,
  };
}
