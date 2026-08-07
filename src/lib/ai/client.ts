import { getAiEngine } from './engine';
import { templates } from './templates';

/**
 * Template-based text generation.
 *
 * Thin adapter between the legacy template registry (`templates.ts`) and the
 * provider-agnostic AI Engine. All provider access, retry, sanitization and
 * telemetry live in the engine — never here.
 */
export async function generateText(
  templateKey: string,
  context: string
): Promise<string> {
  const template = templates.find((item) => item.key === templateKey);
  if (!template) {
    throw new Error('Unknown template');
  }

  const result = await getAiEngine().generateText({
    flow: `template:${templateKey}`,
    model: 'autobuild-default',
    system: template.systemPrompt,
    prompt: template.userPrompt(context),
  });

  return result.text || `[No response from AI for ${template.label}]`;
}
