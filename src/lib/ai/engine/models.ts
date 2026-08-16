import type { ModelInfo } from './types';

/**
 * Model registry.
 *
 * Every model AWIE can call is declared here with its provider and pricing so
 * cost tracking works uniformly. Flows reference models by REGISTRY KEY, never
 * by provider-native id, so swapping the underlying model (or provider) is a
 * one-line change here.
 *
 * Pricing is USD per 1M tokens; 0 means unknown/free tier (cost reported as 0).
 */
export const MODELS: Record<string, ModelInfo> = {
  /** Fast, cheap model for full-site autobuild generation. */
  'autobuild-default': {
    provider: 'gemini',
    model: 'gemini-3.5-flash-lite',
    inputCostPerMTok: 0.1,
    outputCostPerMTok: 0.4,
  },
  /** General-purpose model for drafts, redesign and copy generation. */
  'general-default': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    inputCostPerMTok: 0.27,
    outputCostPerMTok: 1.1,
  },

};

export const DEFAULT_MODEL_KEY = 'general-default';

export function resolveModel(key?: string): ModelInfo {
  return MODELS[key ?? DEFAULT_MODEL_KEY] ?? MODELS[DEFAULT_MODEL_KEY];
}

export function estimateCostUsd(
  info: ModelInfo,
  inputTokens: number,
  outputTokens: number
): number {
  return (
    (inputTokens / 1_000_000) * info.inputCostPerMTok +
    (outputTokens / 1_000_000) * info.outputCostPerMTok
  );
}
