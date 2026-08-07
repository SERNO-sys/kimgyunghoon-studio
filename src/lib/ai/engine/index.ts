/**
 * AWIE V1 - AI Engine entry point.
 *
 * NOTE: This file was reconstructed to restore the V1 engine after a V2
 * infrastructure build collided with the V1 directory layout. It preserves the
 * exact V1 export surface (`getAiEngine`) required by the existing client.
 */

import { AiEngine } from './engine';
import { GeminiProvider } from './providers/gemini';
import { MockProvider } from './providers/mock';
import type { AiProvider, AiProviderId } from './types';

// Re-exported helpers used by existing V1 consumers (e.g. autobuild route).
export { parseJsonResponse } from './sanitize';


let cachedEngine: AiEngine | null = null;

/**
 * Returns the singleton V1 AI Engine with the Gemini and Mock providers
 * registered. Falls back to the Mock provider when Gemini is not configured.
 */
export function getAiEngine(): AiEngine {
  if (cachedEngine) return cachedEngine;

  const providers: Partial<Record<AiProviderId, AiProvider>> = {
    gemini: new GeminiProvider(),
    mock: new MockProvider(),
  };

  cachedEngine = new AiEngine(providers);
  return cachedEngine;
}
