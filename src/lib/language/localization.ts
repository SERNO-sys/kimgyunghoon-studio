/**
 * AWIE V2 — Enrichment Question Localization.
 *
 * Localizes the enrichment question text (the human-readable prompt shown to
 * the user) into the canonical language resolved for the build. The question
 * SLOT and INTENT are ALWAYS the canonical Question Engine identifiers — only
 * the display text is localized.
 *
 * The canonical Question Engine `SlotKey` vocabulary is:
 *   businessType, goals, audience, personality, services, contactPreference,
 *   optionalPreferences.
 *
 * The enrichment Question Mapper maps semantic gaps (trust, location, hours,
 * menu, booking, pricing, portfolio, ...) onto these EXISTING canonical slots.
 * The `optionalPreferences` slot is the free-form catch-all that carries
 * enrichment data that has no dedicated canonical slot.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept. It only maps canonical slots to localized
 * display strings.
 */

import type { SlotKey } from '../question-engine/brief';
import {
  DEFAULT_LANGUAGE,
  LanguageCode,
  type LanguageCodeValue,
} from './types';

/**
 * The localized question text for a canonical Question Engine slot.
 *
 * Each slot maps to a display prompt in each supported language. The slot key
 * itself is never translated — it is the canonical semantic identifier the
 * answer-ingestion bridge uses to re-enter the Brain pipeline.
 */
export type LocalizedQuestionText = Record<LanguageCodeValue, string>;

/**
 * The localized question text for the enrichment-relevant canonical slots.
 *
 * Only the canonical slots that can carry enrichment information are included:
 *   - services: what the business offers (menu, offerings, discovery).
 *   - personality: brand identity, values, tone.
 *   - contactPreference: how customers reach the business (lead capture).
 *   - optionalPreferences: free-form enrichment (location, hours, team,
 *     credentials, booking, pricing, portfolio, ...).
 *
 * The `optionalPreferences` slot is intentionally generic — the specific
 * enrichment intent is carried by the question's `intent` field, not by the
 * slot key.
 */
export const QUESTION_SLOT_TEXT: Partial<Record<SlotKey, LocalizedQuestionText>> = {
  services: {
    [LanguageCode.ko]: '어떤 서비스나 상품을 제공하시나요?',
    [LanguageCode.en]: 'What services or products do you offer?',
    [LanguageCode.ja]: 'どのようなサービスや商品を提供していますか？',
    [LanguageCode.zh]: '您提供哪些服务或产品？',
    [LanguageCode.es]: '¿Qué servicios o productos ofrece?',
    [LanguageCode.fr]: 'Quels services ou produits proposez-vous ?',
    [LanguageCode.de]: 'Welche Dienstleistungen oder Produkte bieten Sie an?',
    [LanguageCode.pt]: 'Que serviços ou produtos você oferece?',
    [LanguageCode.it]: 'Quali servizi o prodotti offrite?',
    [LanguageCode.ru]: 'Какие услуги или товары вы предлагаете?',
    [LanguageCode.ar]: 'ما الخدمات أو المنتجات التي تقدمها؟',
    [LanguageCode.hi]: 'आप कौन सी सेवाएँ या उत्पाद प्रदान करते हैं?',
    [LanguageCode.id]: 'Layanan atau produk apa yang Anda tawarkan?',
    [LanguageCode.th]: 'คุณให้บริการหรือผลิตภัณฑ์อะไรบ้าง?',
    [LanguageCode.vi]: 'Bạn cung cấp dịch vụ hoặc sản phẩm gì?',
    [LanguageCode.tr]: 'Hangi hizmetleri veya ürünleri sunuyorsunuz?',
    [LanguageCode.nl]: 'Welke diensten of producten biedt u aan?',
    [LanguageCode.pl]: 'Jakie usługi lub produkty oferujesz?',
  },
  personality: {
    [LanguageCode.ko]: '비즈니스의 정체성이나 가치관을 알려주세요.',
    [LanguageCode.en]: 'Tell us about your business identity or values.',
    [LanguageCode.ja]: 'ビジネスのアイデンティティや価値観を教えてください。',
    [LanguageCode.zh]: '请介绍一下您的业务定位或价值观。',
    [LanguageCode.es]: 'Cuéntenos sobre la identidad o los valores de su negocio.',
    [LanguageCode.fr]: 'Parlez-nous de l’identité ou des valeurs de votre entreprise.',
    [LanguageCode.de]: 'Erzählen Sie uns von Ihrer Unternehmensidentität oder Ihren Werten.',
    [LanguageCode.pt]: 'Conte-nos sobre a identidade ou os valores do seu negócio.',
    [LanguageCode.it]: 'Raccontateci l’identità o i valori della vostra azienda.',
    [LanguageCode.ru]: 'Расскажите об идентичности или ценностях вашего бизнеса.',
    [LanguageCode.ar]: 'أخبرنا عن هوية نشاطك التجاري أو قيمه.',
    [LanguageCode.hi]: 'अपने व्यवसाय की पहचान या मूल्यों के बारे में बताएं।',
    [LanguageCode.id]: 'Ceritakan tentang identitas atau nilai bisnis Anda.',
    [LanguageCode.th]: 'บอกเราเกี่ยวกับเอกลักษณ์หรือค่านิยมของธุรกิจของคุณ',
    [LanguageCode.vi]: 'Hãy cho chúng tôi biết về bản sắc hoặc giá trị của doanh nghiệp bạn.',
    [LanguageCode.tr]: 'İşletmenizin kimliğini veya değerlerini anlatın.',
    [LanguageCode.nl]: 'Vertel ons over de identiteit of waarden van uw bedrijf.',
    [LanguageCode.pl]: 'Opowiedz nam o tożsamości lub wartościach swojej firmy.',
  },
  contactPreference: {
    [LanguageCode.ko]: '고객이 연락할 수 있는 방법을 알려주세요.',
    [LanguageCode.en]: 'How can customers reach you?',
    [LanguageCode.ja]: 'お客様が連絡できる方法を教えてください。',
    [LanguageCode.zh]: '客户如何联系您？',
    [LanguageCode.es]: '¿Cómo pueden los clientes ponerse en contacto con usted?',
    [LanguageCode.fr]: 'Comment les clients peuvent-ils vous contacter ?',
    [LanguageCode.de]: 'Wie können Kunden Sie erreichen?',
    [LanguageCode.pt]: 'Como os clientes podem entrar em contato com você?',
    [LanguageCode.it]: 'Come possono contattarvi i clienti?',
    [LanguageCode.ru]: 'Как клиенты могут с вами связаться?',
    [LanguageCode.ar]: 'كيف يمكن للعملاء التواصل معك؟',
    [LanguageCode.hi]: 'ग्राहक आपसे कैसे संपर्क कर सकते हैं?',
    [LanguageCode.id]: 'Bagaimana pelanggan dapat menghubungi Anda?',
    [LanguageCode.th]: 'ลูกค้าติดต่อคุณได้อย่างไร?',
    [LanguageCode.vi]: 'Khách hàng có thể liên hệ với bạn bằng cách nào?',
    [LanguageCode.tr]: 'Müşteriler size nasıl ulaşabilir?',
    [LanguageCode.nl]: 'Hoe kunnen klanten u bereiken?',
    [LanguageCode.pl]: 'Jak klienci mogą się z Tobą skontaktować?',
  },
  optionalPreferences: {
    [LanguageCode.ko]: '비즈니스에 대한 추가 정보를 알려주세요.',
    [LanguageCode.en]: 'Tell us more about your business.',
    [LanguageCode.ja]: 'ビジネスについて詳しく教えてください。',
    [LanguageCode.zh]: '请提供更多关于您业务的信息。',
    [LanguageCode.es]: 'Cuéntenos más sobre su negocio.',
    [LanguageCode.fr]: 'Parlez-nous davantage de votre entreprise.',
    [LanguageCode.de]: 'Erzählen Sie uns mehr über Ihr Unternehmen.',
    [LanguageCode.pt]: 'Conte-nos mais sobre o seu negócio.',
    [LanguageCode.it]: 'Raccontateci di più sulla vostra attività.',
    [LanguageCode.ru]: 'Расскажите подробнее о вашем бизнесе.',
    [LanguageCode.ar]: 'أخبرنا المزيد عن نشاطك التجاري.',
    [LanguageCode.hi]: 'अपने व्यवसाय के बारे में और बताएं।',
    [LanguageCode.id]: 'Ceritakan lebih banyak tentang bisnis Anda.',
    [LanguageCode.th]: 'บอกเราเพิ่มเติมเกี่ยวกับธุรกิจของคุณ',
    [LanguageCode.vi]: 'Hãy cho chúng tôi biết thêm về doanh nghiệp của bạn.',
    [LanguageCode.tr]: 'İşletmeniz hakkında daha fazla bilgi verin.',
    [LanguageCode.nl]: 'Vertel ons meer over uw bedrijf.',
    [LanguageCode.pl]: 'Opowiedz nam więcej o swojej firmie.',
  },
};

/**
 * Returns the localized question text for a canonical slot in the given
 * language.
 *
 * Falls back to the default language, then to a generic English prompt, when
 * the slot or language has no entry. The slot key is always canonical.
 */
export function localizeQuestionText(
  slot: SlotKey,
  language: LanguageCodeValue,
): string {
  const byLanguage = QUESTION_SLOT_TEXT[slot];
  if (!byLanguage) {
    return `Please tell us more about your ${slot}.`;
  }
  return byLanguage[language] ?? byLanguage[DEFAULT_LANGUAGE];
}
