import { remark } from 'remark';
import remarkHtml from 'remark-html';

import type { Frontmatter } from '../types/common';

export type FrontmatterParser<TFrontmatter extends object> = (
  data: Frontmatter,
  sourcePath: string
) => TFrontmatter;

export function getString(data: Frontmatter, key: string, sourcePath: string): string {
  const value = data[key];

  if (typeof value !== 'string') {
    throw new Error(`${sourcePath}: '${key}' must be a string.`);
  }

  return value;
}

export function getBoolean(data: Frontmatter, key: string, sourcePath: string): boolean {
  const value = data[key];

  if (typeof value !== 'boolean') {
    throw new Error(`${sourcePath}: '${key}' must be a boolean.`);
  }

  return value;
}

export function getNumber(data: Frontmatter, key: string, sourcePath: string): number {
  const value = data[key];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${sourcePath}: '${key}' must be a finite number.`);
  }

  return value;
}

export function getStringArray(data: Frontmatter, key: string, sourcePath: string): string[] {
  const value = data[key];

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${sourcePath}: '${key}' must be an array of strings.`);
  }

  return value;
}

export async function renderMarkdown(content: string): Promise<string> {
  return String(await remark().use(remarkHtml).process(content));
}

export function wrapMarkdownImages(html: string): string {
  return html.replace(
    /<img([^>]*)alt="([^"]*)"([^>]*)>/g,
    '<figure class="markdown-image">$&<figcaption>$2</figcaption></figure>'
  );
}

export async function renderPostContent(content: string): Promise<string> {
  const html = await renderMarkdown(content);
  return wrapMarkdownImages(html);
}
