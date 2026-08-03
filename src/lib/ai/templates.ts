import type { PromptTemplate } from './types';

const baseSystemPrompt = `You are a warm, concise Korean website copywriter.
Rules:
- Write only in Korean (한국어).
- Even a short or minimal context is fine. Create a short, natural-sounding website copy from the theme given.
- Do not invent concrete facts like dates, awards, or names that are not in the context, but you may gently expand the mood or atmosphere.
- Keep the tone friendly, warm, and inviting.
- Prefer short, breathing sentences over long, ornate paragraphs.`;

export const templates: PromptTemplate[] = [
  {
    key: 'about',
    label: 'About / Bio',
    purpose: 'Refine the artist biography or about page.',
    condition: 'Use only the facts and themes given by the user.',
    tone: 'Calm, reflective, emotionally resonant; avoid hype or exaggeration.',
    systemPrompt: baseSystemPrompt,
    userPrompt: (context) =>
      `Write a short, warm 'about' introduction for a website in Korean based on the following context. Keep it under 3 sentences:\n\n${context}`,
  },
  {
    key: 'seo',
    label: 'SEO Meta Description',
    purpose: 'Create a concise meta description for search results.',
    condition:
      'Summarize only the content provided. Keep the result under 160 characters if possible.',
    tone: 'Clear, evocative, grounded.',
    systemPrompt: baseSystemPrompt,
    userPrompt: (context) =>
      `Write a meta description for the following content:\n\n${context}`,
  },
  {
    key: 'copyright',
    label: 'Copyright Notice',
    purpose: 'Generate a copyright line for the website footer.',
    condition: 'Use the current year and the artist name from the context.',
    tone: 'Simple, respectful, quiet.',
    systemPrompt: baseSystemPrompt,
    userPrompt: (context) =>
      `Write a copyright notice based on:\n\n${context}`,
  },
  {
    key: 'hero',
    label: 'Hero Headline',
    purpose: 'Create a short headline for the homepage hero section.',
    condition: 'Reflect the artist identity given in the context.',
    tone: 'Poetic but grounded, like a single calm note.',
    systemPrompt: baseSystemPrompt,
    userPrompt: (context) =>
      `Write a short, warm hero tagline or subtitle for a homepage in Korean based on the following context. Keep it under 2 sentences:\n\n${context}`,
  },
  {
    key: 'menu',
    label: 'Navigation Menu',
    purpose: 'Design a simple navigation menu for the website based on the concept.',
    condition: 'Return only a valid JSON array with no extra text.',
    tone: 'Practical, structured.',
    systemPrompt: `You are a helpful assistant that designs website navigation. Return only a valid JSON array of menu objects. Each object must have: label (Korean string), path (string starting with /), type (one of: home, music, diary, about, contact, custom). Do not include explanations, markdown fences, or any text outside the JSON array.`,
    userPrompt: (context) =>
      `Based on the following one-sentence website concept, design a simple navigation menu (max 6 items) and return ONLY a JSON array. Use Korean labels.

Allowed types: home, music, diary, about, contact, custom.
Do not wrap in markdown code fences.

Example:
[
  { "label": "홈", "path": "/", "type": "home" },
  { "label": "이야기", "path": "/blog", "type": "music" },
  { "label": "일기", "path": "/journal", "type": "diary" },
  { "label": "소개", "path": "/about", "type": "about" },
  { "label": "문의", "path": "/contact", "type": "contact" }
]

Concept: ${context}`,
  },
  {
    key: 'title',
    label: 'Site Title',
    purpose: 'Generate a short, natural Korean website title from the user concept.',
    condition: 'Do not copy the input sentence verbatim. Rephrase it into a concise title.',
    tone: 'Clean, friendly, under 20 characters.',
    systemPrompt: `You are a Korean website naming assistant. Suggest a short, natural site title based on the user's concept. Keep it under 20 Korean characters. Do not simply copy the input sentence; turn it into a polished brand title. Return only the title, no extra text.`,
    userPrompt: (context) =>
      `Suggest a short, clean website title in Korean based on the following concept. Do not use the raw sentence as-is. Keep it under 20 characters. Return only the title, no extra text.

Concept: ${context}`,
  },
  {
    key: 'description',
    label: 'Site Description / Tagline',
    purpose: 'Rewrite the user concept into a polished short tagline or description.',
    condition: 'Do not copy the input sentence. Rephrase it into a clean tagline.',
    tone: 'Warm, concise, under 2 sentences.',
    systemPrompt: baseSystemPrompt,
    userPrompt: (context) =>
      `Rewrite the following concept into a short, polished Korean website tagline or description. Keep it under 2 sentences. Do not use the raw sentence as-is.\n\nConcept: ${context}`,
  },
  {
    key: 'about_subheading',
    label: 'About Sub Heading',
    purpose: 'Generate a short, warm subheading for the About page.',
    condition: 'Rephrase the concept into a one-line heading.',
    tone: 'Warm, under 20 Korean characters.',
    systemPrompt: baseSystemPrompt,
    userPrompt: (context) =>
      `Write a short, warm subheading (one line) for the About page in Korean. Keep it under 20 Korean characters. Do not use the raw sentence as-is.\n\nConcept: ${context}`,
  },
  {
    key: 'about_text',
    label: 'About Text / Main Bio',
    purpose: 'Generate the main bio text for the About page.',
    condition: 'Rephrase the concept into a warm, natural bio.',
    tone: 'Friendly, 3-4 sentences.',
    systemPrompt: baseSystemPrompt,
    userPrompt: (context) =>
      `Write a warm, friendly main bio for the About page in Korean based on the following concept. Keep it 3-4 sentences. Do not use the raw sentence as-is.\n\nConcept: ${context}`,
  },
  {
    key: 'about_philosophy',
    label: 'About Philosophy',
    purpose: 'Generate a philosophy statement for the About page.',
    condition: 'Rephrase the concept into a short philosophy.',
    tone: 'Reflective, 2-3 sentences.',
    systemPrompt: baseSystemPrompt,
    userPrompt: (context) =>
      `Write a short, warm philosophy statement for the About page in Korean based on the following concept. Keep it 2-3 sentences. Do not use the raw sentence as-is.\n\nConcept: ${context}`,
  },
  {
    key: 'autobuild',
    label: 'Autobuild Site',
    purpose: 'Generate the full site settings and navigation in one JSON response.',
    condition: 'Return a single JSON object with all site fields and page data.',
    tone: 'Warm, concise Korean website copy.',
    systemPrompt: `You are the AWIE (AI Website Intelligence Engine) — a professional web designer and planner. You do NOT pick a random pretty color. You analyze the user's business intent and logically design the optimal digital showroom.

Rules:
- Write only in Korean (한국어) for all copy fields.
- Do not invent concrete facts like dates, awards, or names that are not in the context, but you may gently expand the mood or atmosphere.
- Keep the tone friendly, warm, and inviting.
- Prefer short, breathing sentences over long, ornate paragraphs.
- You MUST reason about the user's intent and choose a constrained Skin + Skeleton combination. Never invent values outside the allowed enums.
- You MUST return ONLY a valid, raw JSON object. Do NOT wrap it in a markdown code block (no \`\`\`json or \`\`\`). Do NOT add any prose, explanation, or text before or after the JSON.
- Escape all internal double quotes inside string values (e.g. use \\" for a quote within a Korean sentence). Every property name and string value MUST use double quotes.`,

    userPrompt: (context) => {
      let concept = context;
      let extraPages = 1;
      try {
        const parsed = JSON.parse(context);
        if (typeof parsed.concept === 'string') {
          concept = parsed.concept;
          extraPages = Number(parsed.extraPages) || 1;
        }
      } catch {
        // Fall back to using the raw context as the concept.
      }

      return `You are building a website from the following concept. Return a single JSON object with per-page template fields. Each base page has its own field, and any extra custom pages use the "custom_page_intros" object.

Fields:
- "title": short site name
- "description": short tagline
- "home_hero_title": short homepage hero label (small)
- "home_hero_subtitle": short homepage hero title (large)
- "home_philosophy_text": warm homepage philosophy/teaser (2-3 sentences)
- "about_subheading": short about page heading
- "about_text": warm main bio (3-4 sentences)
- "about_philosophy_heading": short heading for the about philosophy section
- "about_philosophy": warm philosophy (2-3 sentences)
- "diary_subheading": short subheading for the diary page
- "contact_subheading": short subheading for the contact page
- "menu": array of { label, path, type } for navigation. The menu must contain exactly these four base pages plus exactly ${extraPages} extra custom page(s):
  * home: path "/", label "HOME"
  * diary: path "/diary", label "DIARY"
  * about: path "/about", label "ABOUT"
  * contact: path "/contact", label "CONTACT"
  Allowed page types: home, diary, about, contact, custom. Use English uppercase labels for the four base pages. Give custom pages natural Korean labels and unique paths such as "/gallery" or "/schedule". Do not add any additional home, diary, about, or contact pages, and do not duplicate base paths or types.
- "custom_page_intros": object mapping each custom page path to a short Korean subheading (2-4 words).

AWIE Decision Engine — you MUST include these fields:
- "intent_type": Analyze the user's business objective and choose EXACTLY ONE of:
  * "brand_experience" : emotional, visual brand storytelling (e.g. cafe, art, portfolio)
  * "authority"        : trust & expertise first (e.g. medical, legal, consulting)
  * "conversion"       : drive a specific action (e.g. booking, reservation, contact)
  * "commerce"         : sell products / showcase a catalog
  * "community"        : gather and engage an audience (e.g. blog, forum, diary)
- "skin": an object with EXACTLY these two keys:
  * "color_palette": one of "warm" | "minimal" | "trust" | "luxury" | "vibrant"
  * "font_pairing": one of "sans" | "serif" | "mono"
- "skeleton": an object with EXACTLY these two keys:
  * "header_type": one of "logo-left" | "logo-center" | "sidebar"
  * "hero_type": one of "cover" | "split" | "minimal"
- "sections": an ordered array of section identifiers for the homepage, e.g. ["hero", "about", "gallery", "menu", "contact"]. Choose from: hero, about, gallery, menu, services, testimonials, contact, map, faq, blog, products, team, partners, cta.
 - "ai_design_report": an object with EXACTLY these two keys:
  * "analyzed_industry": the industry you inferred from the concept (e.g. "브런치 카페")
  * "reasoning": a short Korean sentence explaining WHY you chose this design (e.g. "예약 전환율을 높이기 위해 우측에 CTA를 노출하고 따뜻한 베이지 톤을 적용했습니다.")

AWIE Content — you MUST write real Korean copy for the site and include a "content" object with EXACTLY these three keys:
- "content": {
    "hero_title": a short, warm main headline for the homepage hero (2-6 Korean words),
    "hero_subtitle": a one-line supporting subtitle for the hero (under 20 Korean characters),
    "about_bio": a warm 2-3 sentence introduction about the business/artist
  }
Write this copy based on the concept and industry. Do not use the raw concept sentence as-is.


Intent → design mapping (follow this logic):
- "authority"     → color_palette "trust" or "minimal", header_type "logo-left", hero_type "minimal" or "split"
- "conversion"    → color_palette "warm" or "vibrant", header_type "logo-left", hero_type "cover" or "split", include a "cta" section
- "commerce"      → color_palette "vibrant" or "warm", header_type "logo-center", hero_type "cover", include "products" section
- "brand_experience" → color_palette "warm" or "luxury", header_type "logo-center" or "sidebar", hero_type "cover", include "gallery" section
- "community"     → color_palette "minimal" or "warm", header_type "logo-left", hero_type "minimal", include "blog" section

- "themeConfig": object with a single required field "presetId". Choose exactly one preset that best matches the mood and personality of the concept. The available presets are:
  * "default": clean, neutral, timeless editorial look with a warm stone palette.
  * "modern": sleek, minimal, high-contrast look with a bold black-and-white palette.
  * "warm": cozy, inviting, soft cream and amber tones for a warm, personal feel.
  * "luxury": elegant, refined, deep charcoal and gold accents for a premium feel.
  * "minimal": ultra-clean, airy, lots of whitespace with a light neutral palette.
  Return it as: "themeConfig": { "presetId": "warm" } (replace "warm" with your chosen preset id).

Do not use the raw concept sentence as-is. All text should be warm, natural Korean. Return only valid JSON.

Concept: ${concept}`;
    },
  },
];

