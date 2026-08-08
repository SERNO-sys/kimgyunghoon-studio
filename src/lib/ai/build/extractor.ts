/**
 * AWIE V2 - Milestone A1: Real InformationExtractor.
 *
 * Wires the design-only Question Engine to the provider-agnostic AI Engine.
 * The AI does NOT decide business types; it only EXTRACTS them into a
 * BusinessBriefPatch. This is the ONLY place the Question Engine touches the
 * AI — the pipeline itself remains pure orchestration.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - This module is a thin WRAPPER around the AI Engine (Buy Before Build).
 *   - It NEVER mutates ThemeConfig, Core, or the brief.
 *   - It produces a BusinessBriefPatch DATA structure only.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure extraction adapter.
 */

import { parseJsonResponse } from '../engine/sanitize';
import type {
  BusinessBriefPatch,
  SlotKey,
} from '../../question-engine/brief';

import type { Question, UserAnswer } from '../../question-engine/state';

/**
 * The minimal text-generation boundary the extractor depends on.
 *
 * This is a THIN WRAPPER seam: the extractor never imports the concrete AI
 * engine or any provider. The real engine is injected at the composition root
 * (the route), and tests inject a deterministic stub. This keeps the extractor
 * replaceable and free of provider/environment coupling.
 */
export interface TextGenerator {
  generateText(options: {
    flow: string;
    model: string;
    system?: string;
    prompt: string;
    temperature?: number;
  }): Promise<{ text: string }>;
}



/** The JSON shape the AI is asked to return for a single answer. */
interface ExtractionShape {
  businessType?: { primary: string; secondary?: string[] };
  goals?: { primary: string; additional?: string[] };
  audience?: { primary: string; secondary?: string[] };
  personality?: { tone: string; values?: string[] };
  services?: { items: string[] };
  contactPreference?: { channel: string; value: string };
  confidence?: Partial<Record<SlotKey, number>>;
}

/** Builds the extraction prompt for a given question + answer. */
function buildPrompt(question: Question, answer: UserAnswer): string {
  return [
    `You are extracting structured business facts from a single user answer.`,
    ``,
    `Question asked: "${question.text}"`,
    `Target slot: ${question.slot}`,
    ``,
    `User answer: "${answer.text}"`,
    ``,
    `Return ONLY a JSON object with this exact shape:`,
    `{`,
    `  "businessType": { "primary": string, "secondary": string[] },`,
    `  "goals": { "primary": string, "additional": string[] },`,
    `  "audience": { "primary": string, "secondary": string[] },`,
    `  "personality": { "tone": string, "values": string[] },`,
    `  "services": { "items": string[] },`,
    `  "contactPreference": { "channel": string, "value": string },`,
    `  "confidence": { "businessType": 0..1, "goals": 0..1, "audience": 0..1, "personality": 0..1, "services": 0..1, "contactPreference": 0..1 }`,
    `}`,
    ``,
    `Rules:`,
    `- Only include the slot(s) you can confidently extract from THIS answer.`,
    `- Set confidence to 0.9+ when the answer fully fills the slot, 0.5-0.8 when partial.`,
    `- Do NOT invent facts not present in the answer.`,
    `- Return valid JSON only, no markdown fences.`,
  ].join('\n');
}

/**
 * The real InformationExtractor.
 *
 * Uses the AI Engine to extract a BusinessBriefPatch from a user answer. Falls
 * back to a deterministic, rule-based extraction when the AI is unavailable or
 * returns unparseable JSON, so the guided flow never hard-fails.
 */
export class AiInformationExtractor {
  /**
   * @param generator The text-generation boundary. When omitted, the real AI
   *   engine is resolved lazily at call time (composition root default). Tests
   *   inject a deterministic stub to avoid provider/environment coupling.
   */
  constructor(private readonly generator?: TextGenerator) {}

  /**
   * Extracts a BusinessBriefPatch from a user's answer.
   */
  async extract(
    question: Question,
    answer: UserAnswer,
  ): Promise<BusinessBriefPatch> {
    const prompt = buildPrompt(question, answer);

    try {
      const engine = this.generator ?? (await import('../engine')).getAiEngine();
      const result = await engine.generateText({
        flow: 'question-engine:extract',
        model: 'autobuild-default',
        system:
          'You are a deterministic business-fact extractor. Return only JSON.',
        prompt,
        temperature: 0.2,
      });


      const parsed = parseJsonResponse(result.text) as ExtractionShape | null;
      if (parsed && typeof parsed === 'object') {
        return this.toPatch(parsed);
      }
    } catch (error) {
      console.error('[extractor] AI extraction failed, using fallback:', error);
    }

    // Deterministic fallback: extract the target slot from the raw answer.
    return this.fallback(question, answer);
  }

  /** Maps the AI JSON shape to a BusinessBriefPatch. */
  private toPatch(shape: ExtractionShape): BusinessBriefPatch {
    const patch: BusinessBriefPatch = {};
    if (shape.businessType?.primary) {
      patch.businessType = {
        primary: shape.businessType.primary,
        secondary: shape.businessType.secondary ?? [],
      };
    }
    if (shape.goals?.primary) {
      patch.goals = {
        primary: shape.goals.primary,
        additional: shape.goals.additional ?? [],
      };
    }
    if (shape.audience?.primary) {
      patch.audience = {
        primary: shape.audience.primary,
        secondary: shape.audience.secondary ?? [],
      };
    }
    if (shape.personality?.tone) {
      patch.personality = {
        tone: shape.personality.tone,
        values: shape.personality.values ?? [],
      };
    }
    if (shape.services?.items?.length) {
      patch.services = { items: shape.services.items };
    }
    if (shape.contactPreference?.channel && shape.contactPreference?.value) {
      patch.contactPreference = {
        channel: shape.contactPreference.channel,
        value: shape.contactPreference.value,
      };
    }
    if (shape.confidence) {
      patch.confidence = shape.confidence;
    }
    return patch;
  }

  /** Deterministic fallback extraction for the target slot. */
  private fallback(question: Question, answer: UserAnswer): BusinessBriefPatch {
    const text = answer.text.trim();
    const patch: BusinessBriefPatch = {};

    switch (question.slot) {
      case 'businessType':
        patch.businessType = { primary: text, secondary: [] };
        break;
      case 'goals':
        patch.goals = { primary: text, additional: [] };
        break;
      case 'audience':
        patch.audience = { primary: text, secondary: [] };
        break;
      case 'personality':
        patch.personality = { tone: text, values: [] };
        break;
      case 'services':
        patch.services = {
          items: text
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean),
        };
        break;
      case 'contactPreference': {
        const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
        const phone = text.match(/[\d\s()+-]{7,}/);
        if (email) {
          patch.contactPreference = { channel: 'email', value: email[0] };
        } else if (phone) {
          patch.contactPreference = { channel: 'phone', value: phone[0].trim() };
        } else {
          patch.contactPreference = { channel: 'other', value: text };
        }
        break;
      }
      default:
        break;
    }

    patch.confidence = { [question.slot]: 0.9 };
    return patch;
  }
}
