/**
 * AWIE V2 — Enrichment Error Mapping.
 *
 * A pure, provider-independent classifier that turns raw provider/engine
 * failures into SAFE, user-facing messages. It exists so that raw Gemini JSON,
 * stack traces, or internal identifiers NEVER reach the client.
 *
 * Classification is semantic and industry-agnostic:
 *   - 503 / 5xx / overloaded / unavailable  → transient provider outage
 *   - 429 / rate limit / quota              → rate limited
 *   - 400 / invalid request / bad request   → invalid request (deterministic)
 *   - 401 / 403 / api key / permission      → auth / permission (deterministic)
 *   - schema / validation mismatch          → schema mismatch (deterministic)
 *   - anything else                         → internal / unknown
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept. It only maps error signals to localized
 * display strings.
 */

import { LanguageCode, type LanguageCodeValue } from '../language/types';

/**
 * The canonical error categories the enrichment flow can surface to the user.
 *
 * These are semantic categories, not HTTP status codes — the same category may
 * map to different HTTP statuses depending on the caller.
 */
export type EnrichmentErrorCategory =
  | 'transient' // 503 / 5xx / overloaded — safe to retry later
  | 'rate_limited' // 429 / quota
  | 'invalid_request' // 400 / bad request — deterministic, do not retry
  | 'auth' // 401 / 403 / api key — deterministic, do not retry
  | 'schema_mismatch' // validation failure — deterministic, do not retry
  | 'internal'; // unknown / unexpected

/** The localized, user-facing message for each error category. */
export type LocalizedErrorText = Record<LanguageCodeValue, string>;

/**
 * The localized user-facing message for each error category.
 *
 * These are intentionally generic and safe — they never leak provider internals
 * or raw error payloads. The `transient` message tells the user the site is
 * still usable and they can retry later.
 */
export const ERROR_CATEGORY_TEXT: Record<
  EnrichmentErrorCategory,
  LocalizedErrorText
> = {
  transient: {
    [LanguageCode.ko]: 'AI 서버가 일시적으로 바쁩니다. 잠시 후 다시 시도해 주세요. 이미 만들어진 사이트는 그대로 사용할 수 있습니다.',
    [LanguageCode.en]: 'The AI service is temporarily busy. Please try again shortly. Your existing site is still usable.',
    [LanguageCode.ja]: 'AIサーバーが一時的に混雑しています。しばらくしてからもう一度お試しください。作成済みのサイトはそのまま利用できます。',
    [LanguageCode.zh]: 'AI 服务暂时繁忙，请稍后重试。您已生成的网站仍可使用。',
    [LanguageCode.es]: 'El servicio de IA está temporalmente ocupado. Inténtelo de nuevo en breve. Su sitio existente sigue siendo utilizable.',
    [LanguageCode.fr]: 'Le service IA est temporairement occupé. Réessayez bientôt. Votre site existant reste utilisable.',
    [LanguageCode.de]: 'Der KI-Dienst ist vorübergehend ausgelastet. Bitte versuchen Sie es gleich erneut. Ihre bestehende Website bleibt nutzbar.',
    [LanguageCode.pt]: 'O serviço de IA está temporariamente ocupado. Tente novamente em breve. Seu site existente continua utilizável.',
    [LanguageCode.it]: 'Il servizio IA è temporaneamente occupato. Riprova tra poco. Il tuo sito esistente resta utilizzabile.',
    [LanguageCode.ru]: 'Сервис ИИ временно перегружен. Повторите попытку позже. Ваш существующий сайт остаётся доступным.',
    [LanguageCode.ar]: 'خدمة الذكاء الاصطناعي مشغولة مؤقتًا. يرجى المحاولة لاحقًا. موقعك الحالي ما زال قابلاً للاستخدام.',
    [LanguageCode.hi]: 'AI सेवा अस्थायी रूप से व्यस्त है। कृपया थोड़ी देर बाद पुनः प्रयास करें। आपकी मौजूदा साइट उपयोग योग्य है।',
    [LanguageCode.id]: 'Layanan AI sedang sibuk. Silakan coba lagi sebentar lagi. Situs Anda yang sudah ada tetap dapat digunakan.',
    [LanguageCode.th]: 'บริการ AI ไม่ว่างชั่วคราว โปรดลองอีกครั้งในภายหลัง เว็บไซต์ที่มีอยู่ของคุณยังใช้งานได้',
    [LanguageCode.vi]: 'Dịch vụ AI tạm thời bận. Vui lòng thử lại sau. Trang web hiện có của bạn vẫn sử dụng được.',
    [LanguageCode.tr]: 'AI hizmeti geçici olarak meşgul. Lütfen kısa süre sonra tekrar deneyin. Mevcut siteniz hâlâ kullanılabilir.',
    [LanguageCode.nl]: 'De AI-service is tijdelijk bezet. Probeer het zo opnieuw. Uw bestaande site blijft bruikbaar.',
    [LanguageCode.pl]: 'Usługa AI jest chwilowo zajęta. Spróbuj ponownie za chwilę. Twoja istniejąca strona pozostaje użyteczna.',
  },
  rate_limited: {
    [LanguageCode.ko]: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    [LanguageCode.en]: 'Too many requests. Please try again shortly.',
    [LanguageCode.ja]: 'リクエストが多すぎます。しばらくしてからもう一度お試しください。',
    [LanguageCode.zh]: '请求过于频繁，请稍后重试。',
    [LanguageCode.es]: 'Demasiadas solicitudes. Inténtelo de nuevo en breve.',
    [LanguageCode.fr]: 'Trop de requêtes. Réessayez bientôt.',
    [LanguageCode.de]: 'Zu viele Anfragen. Bitte versuchen Sie es gleich erneut.',
    [LanguageCode.pt]: 'Muitas solicitações. Tente novamente em breve.',
    [LanguageCode.it]: 'Troppe richieste. Riprova tra poco.',
    [LanguageCode.ru]: 'Слишком много запросов. Повторите попытку позже.',
    [LanguageCode.ar]: 'طلبات كثيرة جدًا. يرجى المحاولة لاحقًا.',
    [LanguageCode.hi]: 'बहुत अधिक अनुरोध। कृपया थोड़ी देर बाद पुनः प्रयास करें।',
    [LanguageCode.id]: 'Terlalu banyak permintaan. Silakan coba lagi sebentar lagi.',
    [LanguageCode.th]: 'คำขอมากเกินไป โปรดลองอีกครั้งในภายหลัง',
    [LanguageCode.vi]: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    [LanguageCode.tr]: 'Çok fazla istek. Lütfen kısa süre sonra tekrar deneyin.',
    [LanguageCode.nl]: 'Te veel verzoeken. Probeer het zo opnieuw.',
    [LanguageCode.pl]: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.',
  },
  invalid_request: {
    [LanguageCode.ko]: '요청 내용을 확인할 수 없습니다. 입력을 다시 확인해 주세요.',
    [LanguageCode.en]: 'The request could not be processed. Please check your input.',
    [LanguageCode.ja]: 'リクエストを処理できませんでした。入力をご確認ください。',
    [LanguageCode.zh]: '无法处理请求，请检查您的输入。',
    [LanguageCode.es]: 'No se pudo procesar la solicitud. Revise su entrada.',
    [LanguageCode.fr]: 'Impossible de traiter la demande. Vérifiez votre saisie.',
    [LanguageCode.de]: 'Die Anfrage konnte nicht verarbeitet werden. Bitte prüfen Sie Ihre Eingabe.',
    [LanguageCode.pt]: 'Não foi possível processar a solicitação. Verifique sua entrada.',
    [LanguageCode.it]: 'Impossibile elaborare la richiesta. Controlla il tuo input.',
    [LanguageCode.ru]: 'Не удалось обработать запрос. Проверьте введённые данные.',
    [LanguageCode.ar]: 'تعذرت معالجة الطلب. يرجى التحقق من مدخلاتك.',
    [LanguageCode.hi]: 'अनुरोध संसाधित नहीं किया जा सका। कृपया अपना इनपुट जांचें।',
    [LanguageCode.id]: 'Permintaan tidak dapat diproses. Periksa input Anda.',
    [LanguageCode.th]: 'ไม่สามารถประมวลผลคำขอได้ โปรดตรวจสอบข้อมูลของคุณ',
    [LanguageCode.vi]: 'Không thể xử lý yêu cầu. Vui lòng kiểm tra đầu vào của bạn.',
    [LanguageCode.tr]: 'İstek işlenemedi. Lütfen girdinizi kontrol edin.',
    [LanguageCode.nl]: 'Het verzoek kon niet worden verwerkt. Controleer uw invoer.',
    [LanguageCode.pl]: 'Nie można przetworzyć żądania. Sprawdź swoje dane wejściowe.',
  },
  auth: {
    [LanguageCode.ko]: '인증에 실패했습니다. 다시 로그인해 주세요.',
    [LanguageCode.en]: 'Authentication failed. Please sign in again.',
    [LanguageCode.ja]: '認証に失敗しました。再度ログインしてください。',
    [LanguageCode.zh]: '身份验证失败，请重新登录。',
    [LanguageCode.es]: 'Error de autenticación. Vuelva a iniciar sesión.',
    [LanguageCode.fr]: 'Échec de l’authentification. Veuillez vous reconnecter.',
    [LanguageCode.de]: 'Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.',
    [LanguageCode.pt]: 'Falha na autenticação. Entre novamente.',
    [LanguageCode.it]: 'Autenticazione non riuscita. Accedi di nuovo.',
    [LanguageCode.ru]: 'Ошибка аутентификации. Войдите снова.',
    [LanguageCode.ar]: 'فشل المصادقة. يرجى تسجيل الدخول مرة أخرى.',
    [LanguageCode.hi]: 'प्रमाणीकरण विफल। कृपया फिर से साइन इन करें।',
    [LanguageCode.id]: 'Autentikasi gagal. Silakan masuk kembali.',
    [LanguageCode.th]: 'การยืนยันตัวตนล้มเหลว โปรดเข้าสู่ระบบอีกครั้ง',
    [LanguageCode.vi]: 'Xác thực thất bại. Vui lòng đăng nhập lại.',
    [LanguageCode.tr]: 'Kimlik doğrulama başarısız. Lütfen tekrar giriş yapın.',
    [LanguageCode.nl]: 'Authenticatie mislukt. Log opnieuw in.',
    [LanguageCode.pl]: 'Uwierzytelnianie nie powiodło się. Zaloguj się ponownie.',
  },
  schema_mismatch: {
    [LanguageCode.ko]: '생성된 내용을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    [LanguageCode.en]: 'The generated content could not be validated. Please try again shortly.',
    [LanguageCode.ja]: '生成された内容を検証できませんでした。しばらくしてからもう一度お試しください。',
    [LanguageCode.zh]: '无法验证生成的内容，请稍后重试。',
    [LanguageCode.es]: 'No se pudo validar el contenido generado. Inténtelo de nuevo en breve.',
    [LanguageCode.fr]: 'Le contenu généré n’a pas pu être validé. Réessayez bientôt.',
    [LanguageCode.de]: 'Der generierte Inhalt konnte nicht validiert werden. Bitte versuchen Sie es gleich erneut.',
    [LanguageCode.pt]: 'Não foi possível validar o conteúdo gerado. Tente novamente em breve.',
    [LanguageCode.it]: 'Impossibile convalidare il contenuto generato. Riprova tra poco.',
    [LanguageCode.ru]: 'Не удалось проверить сгенерированный контент. Повторите попытку позже.',
    [LanguageCode.ar]: 'تعذر التحقق من المحتوى المُنشأ. يرجى المحاولة لاحقًا.',
    [LanguageCode.hi]: 'जनरेट की गई सामग्री को मान्य नहीं किया जा सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।',
    [LanguageCode.id]: 'Konten yang dihasilkan tidak dapat divalidasi. Silakan coba lagi sebentar lagi.',
    [LanguageCode.th]: 'ไม่สามารถตรวจสอบเนื้อหาที่สร้างขึ้นได้ โปรดลองอีกครั้งในภายหลัง',
    [LanguageCode.vi]: 'Không thể xác thực nội dung đã tạo. Vui lòng thử lại sau.',
    [LanguageCode.tr]: 'Oluşturulan içerik doğrulanamadı. Lütfen kısa süre sonra tekrar deneyin.',
    [LanguageCode.nl]: 'De gegenereerde inhoud kon niet worden gevalideerd. Probeer het zo opnieuw.',
    [LanguageCode.pl]: 'Nie można zweryfikować wygenerowanej treści. Spróbuj ponownie za chwilę.',
  },
  internal: {
    [LanguageCode.ko]: '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    [LanguageCode.en]: 'Something went wrong. Please try again shortly.',
    [LanguageCode.ja]: 'エラーが発生しました。しばらくしてからもう一度お試しください。',
    [LanguageCode.zh]: '发生错误，请稍后重试。',
    [LanguageCode.es]: 'Se produjo un error. Inténtelo de nuevo en breve.',
    [LanguageCode.fr]: 'Une erreur est survenue. Réessayez bientôt.',
    [LanguageCode.de]: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es gleich erneut.',
    [LanguageCode.pt]: 'Ocorreu um erro. Tente novamente em breve.',
    [LanguageCode.it]: 'Si è verificato un errore. Riprova tra poco.',
    [LanguageCode.ru]: 'Произошла ошибка. Повторите попытку позже.',
    [LanguageCode.ar]: 'حدث خطأ. يرجى المحاولة لاحقًا.',
    [LanguageCode.hi]: 'कुछ गलत हो गया। कृपया थोड़ी देर बाद पुनः प्रयास करें।',
    [LanguageCode.id]: 'Terjadi kesalahan. Silakan coba lagi sebentar lagi.',
    [LanguageCode.th]: 'เกิดข้อผิดพลาด โปรดลองอีกครั้งในภายหลัง',
    [LanguageCode.vi]: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    [LanguageCode.tr]: 'Bir hata oluştu. Lütfen kısa süre sonra tekrar deneyin.',
    [LanguageCode.nl]: 'Er is een fout opgetreden. Probeer het zo opnieuw.',
    [LanguageCode.pl]: 'Wystąpił błąd. Spróbuj ponownie za chwilę.',
  },
};

/**
 * Classifies a raw error into a canonical semantic category.
 *
 * The classification is based on the error message text and is intentionally
 * conservative: it only matches well-known, stable signals. Anything unknown
 * falls back to `internal`.
 */
export function classifyEnrichmentError(error: unknown): EnrichmentErrorCategory {
  const message = error instanceof Error ? error.message : String(error);
  const m = message.toLowerCase();

  // Deterministic auth / permission failures — never retried.
  if (/401|403|unauthorized|forbidden|api key|permission|not authorized|invalid key/i.test(m)) {
    return 'auth';
  }

  // Deterministic invalid-request failures — never retried.
  if (/400|bad request|invalid request|invalid argument|invalid value/i.test(m)) {
    return 'invalid_request';
  }

  // Deterministic schema / validation failures — never retried.
  if (/schema|validation|mismatch|parse|invalid_json|empty_response/i.test(m)) {
    return 'schema_mismatch';
  }

  // Rate limiting / quota.
  if (/429|rate.?limit|quota|too many requests/i.test(m)) {
    return 'rate_limited';
  }

  // Transient provider outages (503 / 5xx / overloaded / unavailable).
  if (/5\d{2}|503|overloaded|unavailable|temporarily|busy|timeout|timed out|network|fetch failed|ECONNRESET/i.test(m)) {
    return 'transient';
  }

  return 'internal';
}

/**
 * Returns the safe, localized user-facing message for a raw error.
 *
 * This is the ONLY function the route/UI should use to surface provider errors.
 * It never leaks the raw error text to the client.
 */
export function localizeEnrichmentError(
  error: unknown,
  language: LanguageCodeValue = LanguageCode.en,
): string {
  const category = classifyEnrichmentError(error);
  const byLanguage = ERROR_CATEGORY_TEXT[category];
  return byLanguage[language] ?? byLanguage[LanguageCode.en];
}
