import { getEnv } from '@/config/env';
import { templates } from './templates';

export async function generateText(
  templateKey: string,
  context: string
): Promise<string> {
  const template = templates.find((item) => item.key === templateKey);
  if (!template) {
    throw new Error('Unknown template');
  }

  const { GEMINI_API_KEY: apiKey } = getEnv();
  if (!apiKey) {
    return `[Mock Gemini Generated Text]\n\nTemplate: ${template.label}\nPurpose: ${template.purpose}\nCondition: ${template.condition}\nTone: ${template.tone}\n\nContext:\n${context}\n\nThis is a placeholder response. Once GEMINI_API_KEY is configured, the real Gemini API will generate text using the structured prompt above.`;
  }

  // TODO: call Google Gemini API with template.systemPrompt and template.userPrompt(context).
  return `Generated ${template.label} content based on: ${context}`;
}
