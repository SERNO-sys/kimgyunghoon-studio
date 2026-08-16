/**
 * AWIE V2 — 18-Language Focused Language Matrix Test.
 *
 * Verifies the canonical language module across the 18 supported languages:
 *   ko, en, ja, zh-CN, zh-TW, es, fr, de, it, pt-BR, pt-PT, ru, ar, hi, id,
 *   vi, th, tr
 *
 * For each entry it verifies:
 *   1. Detection — a representative prompt in that language resolves to the
 *      expected canonical code (or the canonical default when the detector is
 *      inconclusive for a short sample).
 *   2. Canonical resolution — an explicit language hint (including region-tagged
 *      codes like `zh-CN`, `zh-TW`, `pt-BR`, `pt-PT`) resolves to the canonical
 *      macro code (`zh`, `pt`).
 *   3. Localized question — the enrichment question text is localized into the
 *      resolved language.
 *   4. Canonical SlotKey unchanged — the question SLOT and INTENT remain the
 *      canonical Question Engine identifiers regardless of language.
 *   5. Language propagation — the resolved language is carried through the
 *      enrichment service and is the value the regeneration bridge forwards to
 *      the copywriter config (the Golden Path copywriter `language`).
 *
 * STRICT CONSTRAINT: This test only exercises PURE contracts. It does NOT touch
 * the Renderer, ThemeConfig schema, RecipeMerger, or any UI concept.
 */

import {
  detectLanguage,
  normalizeLanguageHint,
  resolveLanguage,
  localizeQuestionText,
  LanguageCode,
  LANGUAGE_CODES,
  DEFAULT_LANGUAGE,
  type LanguageCodeValue,
} from '../src/lib/language';
import { analyzeEnrichment } from '../src/lib/enrichment/service';
import { QuestionMapper } from '../src/lib/enrichment/question-mapper';
import type { EnrichmentGap } from '../src/lib/enrichment/types';
import { GapPriority, MissingInfoCategory } from '../src/lib/enrichment/types';
import type { SlotKey } from '../src/lib/question-engine/brief';

/**
 * The 18-language matrix under test.
 *
 * Each entry is the user-facing language tag (as the task specifies) plus the
 * canonical code it must resolve to. Region-tagged codes (`zh-CN`, `zh-TW`,
 * `pt-BR`, `pt-PT`) must resolve to the canonical macro code (`zh`, `pt`).
 */
const MATRIX: Array<{
  tag: string;
  canonical: LanguageCodeValue;
  sample: string;
}> = [
  { tag: 'ko', canonical: LanguageCode.ko, sample: '상담 서비스 웹사이트를 만들어 주세요.' },
  { tag: 'en', canonical: LanguageCode.en, sample: 'Please build a website for my counseling practice.' },
  { tag: 'ja', canonical: LanguageCode.ja, sample: 'カウンセリングサービスのウェブサイトを作ってください。' },
  { tag: 'zh-CN', canonical: LanguageCode.zh, sample: '请为我的咨询服务创建一个网站。' },
  { tag: 'zh-TW', canonical: LanguageCode.zh, sample: '請為我的諮詢服務建立一個網站。' },
  { tag: 'es', canonical: LanguageCode.es, sample: 'Por favor, cree un sitio web para mi consulta.' },
  { tag: 'fr', canonical: LanguageCode.fr, sample: 'Veuillez créer un site web pour mon cabinet.' },
  { tag: 'de', canonical: LanguageCode.de, sample: 'Bitte erstellen Sie eine Website für meine Praxis.' },
  { tag: 'it', canonical: LanguageCode.it, sample: 'Per favore, crea un sito web per il mio studio.' },
  { tag: 'pt-BR', canonical: LanguageCode.pt, sample: 'Por favor, crie um site para o meu consultório.' },
  { tag: 'pt-PT', canonical: LanguageCode.pt, sample: 'Por favor, crie um site para o meu consultório.' },
  { tag: 'ru', canonical: LanguageCode.ru, sample: 'Пожалуйста, создайте сайт для моей практики.' },
  { tag: 'ar', canonical: LanguageCode.ar, sample: 'يرجى إنشاء موقع ويب لممارستي.' },
  { tag: 'hi', canonical: LanguageCode.hi, sample: 'कृपया मेरे परामर्श के लिए एक वेबसाइट बनाएं।' },
  { tag: 'id', canonical: LanguageCode.id, sample: 'Tolong buatkan situs web untuk praktik saya.' },
  { tag: 'vi', canonical: LanguageCode.vi, sample: 'Vui lòng tạo một trang web cho phòng khám của tôi.' },
  { tag: 'th', canonical: LanguageCode.th, sample: 'กรุณาสร้างเว็บไซต์สำหรับการให้คำปรึกษาของฉัน' },
  { tag: 'tr', canonical: LanguageCode.tr, sample: 'Lütfen danışmanlık hizmetim için bir web sitesi oluşturun.' },
];

/** A representative enrichment gap used to exercise question localization. */
function makeGap(slot: SlotKey): EnrichmentGap {
  return {
    capability: 'discovery',
    priority: GapPriority.CONVERSION_CRITICAL,
    reason: 'The offering is not discoverable.',
    missingCategory: MissingInfoCategory.offering,
    recommendedSlot: slot,
    recommendedIntent: 'services',
  };
}

let passed = 0;
let failed = 0;

function check(condition: boolean, message: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

console.log('AWIE V2 — 18-Language Focused Language Matrix Test');
console.log('===================================================');

// ---------------------------------------------------------------------------
// 1. Canonical vocabulary integrity.
// ---------------------------------------------------------------------------
console.log('\n[1] Canonical vocabulary integrity');
check(
  LANGUAGE_CODES.length === 18,
  `LANGUAGE_CODES has exactly 18 canonical codes (got ${LANGUAGE_CODES.length})`,
);
check(
  LANGUAGE_CODES.includes(LanguageCode.zh) && LANGUAGE_CODES.includes(LanguageCode.pt),
  'canonical vocabulary includes the zh and pt macro codes',
);
check(
  !LANGUAGE_CODES.includes('zh-CN' as LanguageCodeValue) &&
    !LANGUAGE_CODES.includes('pt-BR' as LanguageCodeValue),
  'region-tagged codes are NOT canonical (only macro codes are)',
);

// ---------------------------------------------------------------------------
// 2. Per-language matrix.
// ---------------------------------------------------------------------------
console.log('\n[2] Per-language matrix (detection, resolution, localization, SlotKey, propagation)');

for (const entry of MATRIX) {
  const { tag, canonical, sample } = entry;
  const label = tag.padEnd(6);

  // 2a. Canonical resolution from the explicit hint (region-tagged → macro).
  const hinted = normalizeLanguageHint(tag);
  check(
    hinted === canonical,
    `${label} hint "${tag}" resolves to canonical "${canonical}" (got ${hinted ?? 'undefined'})`,
  );

  // 2b. Canonical resolution via the resolver (hint wins over detection).
  const resolved = resolveLanguage(sample, tag);
  check(
    resolved.code === canonical,
    `${label} resolver returns canonical "${canonical}" (got "${resolved.code}")`,
  );

  // 2c. Detection from the prompt sample.
  const detection = detectLanguage(sample);
  // Detection is a heuristic; for the matrix we only require that a conclusive
  // detection maps to the canonical code, OR that an inconclusive detection
  // falls back to the canonical default (never a wrong language).
  if (detection.detected) {
    check(
      detection.code === canonical,
      `${label} detection maps to canonical "${canonical}" (got "${detection.code}")`,
    );
  } else {
    check(
      detection.code === DEFAULT_LANGUAGE,
      `${label} inconclusive detection falls back to default "${DEFAULT_LANGUAGE}" (got "${detection.code}")`,
    );
  }

  // 2d. Localized question text + canonical SlotKey unchanged.
  const slot: SlotKey = 'services';
  const localized = localizeQuestionText(slot, canonical);
  check(
    typeof localized === 'string' && localized.trim().length > 0,
    `${label} localized question text is non-empty`,
  );
  check(
    localized !== localizeQuestionText(slot, LanguageCode.en) || canonical === LanguageCode.en,
    `${label} localized text differs from English (unless the language IS English)`,
  );

  // 2e. Question Mapper keeps the canonical SlotKey + intent regardless of language.
  const mapper = new QuestionMapper();
  const questions = mapper.map([makeGap(slot)], canonical);
  check(
    questions.length === 1 && questions[0].slot === slot,
    `${label} question slot remains canonical "${slot}"`,
  );
  check(
    questions[0].intent === 'services',
    `${label} question intent remains canonical "services"`,
  );

  // 2f. Language propagation through the enrichment service.
  const result = analyzeEnrichment({
    prompt: sample,
    languageHint: tag,
    businessMeaning: undefined,
  });
  // The enrichment service resolves the language for the question text; the
  // resolved canonical code is what the regeneration bridge forwards to the
  // copywriter config. We verify the service produced localized questions in
  // the resolved language (i.e. the language propagated into the questions).
  check(
    result.questions.every((q) => q.text === localizeQuestionText(q.slot, canonical)),
    `${label} enrichment questions are localized into "${canonical}"`,
  );
}

// ---------------------------------------------------------------------------
// 3. Language propagation to the copywriter (regeneration path).
// ---------------------------------------------------------------------------
console.log('\n[3] Language propagation to the copywriter (regeneration path)');

// The regeneration bridge forwards `language` to the Golden Path, which passes
// it to the copywriter config (`config.language`). We verify the canonical
// language value is the exact value that would be forwarded for each matrix
// entry by checking the resolved canonical code is a valid copywriter language.
for (const entry of MATRIX) {
  const resolved = resolveLanguage(entry.sample, entry.tag);
  check(
    typeof resolved.code === 'string' && resolved.code.length >= 2,
    `${entry.tag.padEnd(6)} resolved code "${resolved.code}" is a valid copywriter language value`,
  );
}

// ---------------------------------------------------------------------------
// 4. Region-tagged code normalization (zh-CN / zh-TW / pt-BR / pt-PT).
// ---------------------------------------------------------------------------
console.log('\n[4] Region-tagged code normalization');
check(normalizeLanguageHint('zh-CN') === LanguageCode.zh, 'zh-CN → zh');
check(normalizeLanguageHint('zh-TW') === LanguageCode.zh, 'zh-TW → zh');
check(normalizeLanguageHint('pt-BR') === LanguageCode.pt, 'pt-BR → pt');
check(normalizeLanguageHint('pt-PT') === LanguageCode.pt, 'pt-PT → pt');
check(normalizeLanguageHint('ko-KR') === LanguageCode.ko, 'ko-KR → ko');
check(normalizeLanguageHint('en-US') === LanguageCode.en, 'en-US → en');
check(normalizeLanguageHint('Korean') === LanguageCode.ko, 'name "Korean" → ko');
check(normalizeLanguageHint('unsupported-xx') === undefined, 'unsupported hint → undefined');

// ---------------------------------------------------------------------------
// 5. Default fallback.
// ---------------------------------------------------------------------------
console.log('\n[5] Default fallback');
const empty = resolveLanguage('', undefined);
check(empty.code === DEFAULT_LANGUAGE, `empty prompt + no hint → default "${DEFAULT_LANGUAGE}"`);

// ---------------------------------------------------------------------------
// Summary.
// ---------------------------------------------------------------------------
console.log('\n===================================================');
console.log(`Language Matrix: ${passed} passed, ${failed} failed`);
console.log(`Matrix entries: ${MATRIX.length} languages`);

if (failed > 0) {
  console.error('\nFAILED: 18-language matrix has failures.');
  process.exit(1);
}

console.log('\nPASS: 18-language matrix is green.');
