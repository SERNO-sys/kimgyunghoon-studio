import type { PromptTemplate } from './types';

const baseSystemPrompt = `You are a writing assistant for a composer and musician's personal website.
Brand spirit: "a lotus that does not hate the mud" — grounded, calm, emotionally resonant.
Rules:
- Write only from the facts provided.
- Never invent biographical details, dates, achievements, or relationships.
- If the context is insufficient, respond exactly: "I need more information to write this."
- Keep the tone poetic but restrained, like quiet soil beneath music.
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
      `Write or refine an artist bio based on the following context:\n\n${context}`,
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
      `Write a hero headline for the homepage based on:\n\n${context}`,
  },
];
