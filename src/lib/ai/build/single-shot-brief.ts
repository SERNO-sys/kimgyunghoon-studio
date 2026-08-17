/**
 * AWIE V2 - Single-shot Input Boundary Adapter.
 *
 * Converts a raw one-line user prompt into a BusinessBrief WITHOUT invoking any
 * AI, WITHOUT inventing facts, and WITHOUT touching the turn-based Question
 * Engine flow.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - This adapter exists BEFORE the Brain. Its ONLY responsibility is
 *     `string -> BusinessBrief` (and, for semantic preservation, `string ->
 *     EvidenceSet[]`).
 *   - The Brain remains completely unaware of the input source.
 *   - It reuses the existing deterministic extraction/fallback logic
 *     (AiInformationExtractor.extractFallback) and the existing merge mechanism
 *     (MergeEngine) over createEmptyBrief().
 *
 * SHORT INPUT POLICY (absolute):
 *   - Known meaning -> preserve.
 *   - Unknown facts -> remain unspecified.
 *   - It NEVER invents goals, audience, services, prices, products, hours,
 *     address, reviews, certifications, facilities, or demographics.
 *
 * SEMANTIC EVIDENCE PRESERVATION (AWIE V2):
 *   `extractSingleShotEvidence()` deterministically preserves user-asserted
 *   semantic facts (offering, address, tone) that are EXPLICITLY present in the
 *   raw prompt, using the EXISTING evidence contract (EvidenceSet / Evidence /
 *   user_asserted provenance) and the EXISTING canonical semantic subjects
 *   (offering, address, trust, ...). It is:
 *     - deterministic & synchronous (no AI, no network)
 *     - provider-independent
 *     - multilingual-safe (conservative patterns; unknown input is left
 *       unextracted rather than guessed)
 *     - strictly additive: it never fabricates facts, never upgrades
 *       provenance, and never invents a goal from a commercial-sounding prompt.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic, UI
 * concepts, Recipe concepts, ThemeConfig concepts, or capability decisions.
 * It is a pure deterministic boundary adapter.
 */

import {
  createEmptyBrief,
  MergeEngine,
  type BusinessBrief,
  type BusinessBriefPatch,
} from '../../question-engine/brief';
import { AiInformationExtractor } from './extractor';
import {
  Provenance,
  type Evidence,
  type EvidenceSet,
} from '../../brain/evidence';

/** Thrown when the raw prompt is empty or whitespace-only. */
export class EmptyPromptError extends Error {
  constructor() {
    super('Single-shot brief requires a non-empty prompt.');
    this.name = 'EmptyPromptError';
  }
}

/**
 * Converts a raw one-line prompt into a BusinessBrief.
 *
 * Deterministic, synchronous, and free of any external AI/provider invocation.
 * Only the businessType slot is preserved from the raw prompt (via the existing
 * deterministic fallback extraction). All other business facts remain
 * unspecified.
 *
 * @param prompt The raw one-line user input (e.g. "카페").
 * @returns A valid, immutable BusinessBrief.
 * @throws EmptyPromptError when the prompt is empty or whitespace-only.
 */
export function extractSingleShotBrief(prompt: string): BusinessBrief {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    throw new EmptyPromptError();
  }

  const extractor = new AiInformationExtractor();
  const patch: BusinessBriefPatch = extractor.extractFallback(
    'businessType',
    trimmed,
  );

  const merger = new MergeEngine();
  return merger.apply(createEmptyBrief(), patch);
}

/**
 * A curated set of Korean tone/positioning adjectives that are safe to preserve
 * as `trust`-subject evidence. Only words present verbatim in the prompt are
 * extracted; arbitrary adjectives are never turned into facts.
 */
const KOREAN_TONE_LEXICON: readonly string[] = [
  '감성적인',
  '프리미엄',
  '고급스러운',
  '따뜻한',
  '모던한',
  '클래식한',
  '트렌디한',
  '전문적인',
  '세련된',
  '차분한',
  '우아한',
  '개성적인',
];

/**
 * A curated set of English tone/positioning adjectives that are safe to
 * preserve as `trust`-subject evidence.
 */
const ENGLISH_TONE_LEXICON: readonly string[] = [
  'premium',
  'luxury',
  'warm',
  'modern',
  'classic',
  'trendy',
  'professional',
  'emotional',
  'artistic',
  'elegant',
  'minimal',
  'sophisticated',
];

/**
 * A curated set of Japanese tone/positioning adjectives that are safe to
 * preserve as `trust`-subject evidence.
 */
const JAPANESE_TONE_LEXICON: readonly string[] = [
  '感性的な',
  'プレミアム',
  '高級',
  '温かい',
  'モダン',
  'クラシック',
  'トレンディ',
  'プロフェッショナル',
  'エレガント',
];

/**
 * A curated set of Korean administrative region names used for safe, explicit
 * location extraction. Only these names (when present in the prompt) are
 * preserved as `address`-subject evidence. Unknown place names are left
 * unextracted rather than guessed.
 */
const KOREAN_REGION_LEXICON: readonly string[] = [
  '서울',
  '부산',
  '대구',
  '인천',
  '광주',
  '대전',
  '울산',
  '세종',
  '제주',
  '경기',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
];

/**
 * Deterministically extracts user-asserted semantic evidence from a raw
 * one-line prompt.
 *
 * This is the semantic-preservation companion to `extractSingleShotBrief`. It
 * reuses the EXISTING evidence contract (EvidenceSet / Evidence /
 * user_asserted provenance) and the EXISTING canonical semantic subjects
 * (`offering`, `address`, `trust`, `business_type`). It is:
 *   - deterministic & synchronous (no AI, no network)
 *   - provider-independent
 *   - multilingual-safe (Korean / English / Japanese conservative patterns)
 *   - strictly additive: it never fabricates facts, never upgrades provenance,
 *     and never invents a goal from a commercial-sounding prompt.
 *
 * @param prompt The raw one-line user input.
 * @returns A list of EvidenceSet, one per recognized semantic subject. Empty
 *   when no explicit facts are recognized.
 */
export function extractSingleShotEvidence(prompt: string): EvidenceSet[] {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const evidence: EvidenceSet[] = [];

  // 1. Offering (services) — subject `offering`.
  const offerings = extractOfferings(trimmed);
  if (offerings.length > 0) {
    evidence.push({
      subject: 'offering',
      items: offerings.map((claim, i) => ({
        id: `single-shot.offering.${i}`,
        provenance: Provenance.user_asserted,
        claim,
      })),
    });
  }

  // 2. Location — subject `address`.
  const location = extractLocation(trimmed);
  if (location) {
    evidence.push({
      subject: 'address',
      items: [
        {
          id: 'single-shot.address.0',
          provenance: Provenance.user_asserted,
          claim: location,
        },
      ],
    });
  }

  // 3. Tone / positioning — subject `trust` (matches the enrichment bridge's
  //    `personality -> trust` mapping). NOTE: this does NOT activate the trust
  //    capability, which requires `testimonial`-subject evidence. It only
  //    preserves the explicitly stated tone fact.
  const tone = extractTone(trimmed);
  if (tone) {
    evidence.push({
      subject: 'trust',
      items: [
        {
          id: 'single-shot.trust.0',
          provenance: Provenance.user_asserted,
          claim: tone,
        },
      ],
    });
  }

  // 4. Business type — subject `business_type` (matches the enrichment bridge's
  //    `businessType -> business_type` mapping). This is the same value already
  //    preserved in the BusinessBrief.businessType slot; it is carried as
  //    evidence for fidelity but does not activate any capability (it is not a
  //    DataRequirementKey).
  const businessType = extractBusinessType(trimmed);
  if (businessType) {
    evidence.push({
      subject: 'business_type',
      items: [
        {
          id: 'single-shot.business_type.0',
          provenance: Provenance.user_asserted,
          claim: businessType,
        },
      ],
    });
  }

  return evidence;
}

/**
 * Extracts explicit offering/service claims from the prompt.
 *
 * Conservative, multilingual patterns:
 *   - Korean: `X을/를 전문으로` (the noun phrase before `을/를 전문으로`),
 *     split on `과/와/및` and `,`/`·`.
 *   - English: `specializ(e|es|ing) in X`, `specialist in X`, `focus(es|ing)? on X`.
 *   - Japanese: `Xを専門`.
 *
 * Returns an empty array when no explicit offering is recognized.
 */
function extractOfferings(prompt: string): string[] {
  const claims: string[] = [];

  // Korean: capture the noun phrase before `을/를 전문으로`.
  const koMatch = prompt.match(/([가-힣0-9A-Za-z\s·,]+?)(?:을|를)\s*전문으로/);
  if (koMatch && koMatch[1]) {
    const raw = koMatch[1].trim();
    const parts = raw
      .split(/[과와및,·]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const part of parts) {
      if (part.length > 0) {
        claims.push(part);
      }
    }
  }

  // English: `specialize(s|ing) in X` / `specialist in X` / `focus(es|ing)? on X`.
  const enMatch = prompt.match(
    /(?:specializ(?:e|es|ing)|specialist|focus(?:es|ing)?)\s+(?:in|on)\s+([A-Za-z0-9\s&,·-]+?)(?:\.|,|$)/i,
  );
  if (enMatch && enMatch[1]) {
    const raw = enMatch[1].trim();
    const parts = raw
      .split(/[,&·]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const part of parts) {
      if (part.length > 0) {
        claims.push(part);
      }
    }
  }

  // Japanese: `Xを専門`.
  const jaMatch = prompt.match(/([\u3040-\u30ff\u4e00-\u9fff0-9A-Za-z\s・,]+?)を\s*専門/);
  if (jaMatch && jaMatch[1]) {
    const raw = jaMatch[1].trim();
    const parts = raw
      .split(/[とや、・,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const part of parts) {
      if (part.length > 0) {
        claims.push(part);
      }
    }
  }

  // Deduplicate while preserving order.
  const seen = new Set<string>();
  return claims.filter((c) => {
    const key = c.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extracts an explicit location claim from the prompt.
 *
 * Conservative, multilingual patterns:
 *   - Korean: a curated region name followed by `에서 활동` / `에서` / `기반`.
 *   - English: `based in X`, `located in X`, `serving X`.
 *   - Japanese: `Xで活動`, `Xにて活動`, `Xを拠点`.
 *
 * Returns undefined when no explicit location is recognized.
 */
function extractLocation(prompt: string): string | undefined {
  // Korean: curated region name + activity/location marker.
  for (const region of KOREAN_REGION_LEXICON) {
    if (
      new RegExp(`${region}(?:에서|에서 활동|기반|을 기반으로|을 중심으로)`).test(
        prompt,
      )
    ) {
      return region;
    }
  }

  // English: `based in X` / `located in X` / `serving X`.
  const enMatch = prompt.match(
    /(?:based in|located in|serving)\s+([A-Z][A-Za-z\s-]+?)(?:\.|,|$)/i,
  );
  if (enMatch && enMatch[1]) {
    return enMatch[1].trim();
  }

  // Japanese: `Xで活動` / `Xにて活動` / `Xを拠点`.
  const jaMatch = prompt.match(
    /([\u3040-\u30ff\u4e00-\u9fff]+?)(?:で活動|にて活動|を拠点)/,
  );
  if (jaMatch && jaMatch[1]) {
    return jaMatch[1].trim();
  }

  return undefined;
}

/**
 * Extracts an explicit tone/positioning adjective from the prompt.
 *
 * Only curated tone words present verbatim are extracted. Arbitrary adjectives
 * are never turned into facts. Returns undefined when no known tone word is
 * present.
 */
function extractTone(prompt: string): string | undefined {
  const lower = prompt.toLowerCase();

  for (const tone of KOREAN_TONE_LEXICON) {
    if (prompt.includes(tone)) return tone;
  }
  for (const tone of ENGLISH_TONE_LEXICON) {
    if (lower.includes(tone)) return tone;
  }
  for (const tone of JAPANESE_TONE_LEXICON) {
    if (prompt.includes(tone)) return tone;
  }

  return undefined;
}

/**
 * Extracts the business type from the prompt using the same deterministic
 * fallback extraction as `extractSingleShotBrief`. Returns undefined when the
 * prompt is empty.
 */
function extractBusinessType(prompt: string): string | undefined {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) return undefined;
  const extractor = new AiInformationExtractor();
  const patch = extractor.extractFallback('businessType', trimmed);
  return patch.businessType?.primary;
}
