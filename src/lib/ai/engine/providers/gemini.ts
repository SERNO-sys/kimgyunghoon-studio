import { GoogleGenAI } from '@google/genai';
import { getEnv } from '@/config/env';
import type { AiProvider, ProviderRequest, ProviderResponse, TokenUsage } from '../types';

/**
 * Google Gemini provider adapter.
 *
 * This is the ONLY file in the AI Engine allowed to import `@google/genai`.
 * All Gemini-specific request/response mapping is contained here.
 */
export class GeminiProvider implements AiProvider {
  readonly id = 'gemini' as const;

  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI | null {
    if (this.client) return this.client;
    const { GEMINI_API_KEY: apiKey } = getEnv();
    if (!apiKey) return null;
    this.client = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    return this.client;
  }

  isConfigured(): boolean {
    return this.getClient() !== null;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    const client = this.getClient();
    if (!client) {
      throw new Error('Gemini API key is not configured');
    }

    const response = await client.models.generateContent({
      model: request.model,
      contents: request.prompt,
      config: {
        ...(request.system ? { systemInstruction: request.system } : {}),
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        ...(request.maxOutputTokens !== undefined
          ? { maxOutputTokens: request.maxOutputTokens }
          : {}),
      },
    });

    return {
      text: typeof response.text === 'string' ? response.text : '',
      usage: toUsage(response.usageMetadata),
    };
  }

  async *generateStream(request: ProviderRequest): AsyncIterable<string> {
    const client = this.getClient();
    if (!client) {
      throw new Error('Gemini API key is not configured');
    }

    const stream = await client.models.generateContentStream({
      model: request.model,
      contents: request.prompt,
      config: {
        ...(request.system ? { systemInstruction: request.system } : {}),
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        ...(request.maxOutputTokens !== undefined
          ? { maxOutputTokens: request.maxOutputTokens }
          : {}),
      },
    });

    for await (const chunk of stream) {
      const text = typeof chunk.text === 'string' ? chunk.text : '';
      if (text) yield text;
    }
  }
}

function toUsage(
  metadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  } | null
): TokenUsage {
  const inputTokens = metadata?.promptTokenCount ?? 0;
  const outputTokens = metadata?.candidatesTokenCount ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: metadata?.totalTokenCount ?? inputTokens + outputTokens,
  };
}
