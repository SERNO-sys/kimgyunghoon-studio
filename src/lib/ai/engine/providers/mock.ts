import type { AiProvider, ProviderRequest, ProviderResponse } from '../types';

/**
 * Mock provider used when no real provider is configured (local development
 * without an API key). Returns a deterministic placeholder so UI flows remain
 * testable end-to-end.
 */
export class MockProvider implements AiProvider {
  readonly id = 'mock' as const;

  isConfigured(): boolean {
    return true;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    return {
      text: buildMockText(request),
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }

  async *generateStream(request: ProviderRequest): AsyncIterable<string> {
    yield buildMockText(request);
  }
}

function buildMockText(request: ProviderRequest): string {
  return [
    '[Mock AI Response]',
    '',
    `Model: ${request.model}`,
    request.system ? `System:\n${request.system}` : '',
    `Prompt:\n${request.prompt}`,
    '',
    'This is a placeholder response. Configure an AI provider API key (e.g. GEMINI_API_KEY) to enable real generation.',
  ]
    .filter(Boolean)
    .join('\n');
}
