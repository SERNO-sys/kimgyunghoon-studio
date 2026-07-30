import { GoogleGenAI } from '@google/genai';
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

  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: template.userPrompt(context),
    config: {
      systemInstruction: template.systemPrompt,
    },
  });
  const generated =
    typeof response.text === 'string' ? response.text : '';
  return generated || `[No response from Gemini for ${template.label}]`;
}
