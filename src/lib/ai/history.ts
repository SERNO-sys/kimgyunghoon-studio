import type { GenerationHistoryItem } from './types';

const generationHistory: GenerationHistoryItem[] = [];

export function saveGeneration(item: GenerationHistoryItem): void {
  generationHistory.unshift(item);
}

export function getGenerationHistory(): GenerationHistoryItem[] {
  return generationHistory;
}
