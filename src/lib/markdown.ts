import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

import type { ContentItem, Frontmatter } from '../types/common';

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

export async function getMarkdownSlugs(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name) === '.md')
    .map((entry) => path.basename(entry.name, '.md'));
}

export async function parseMarkdownFile<TFrontmatter extends object>(
  sourcePath: string,
  slug: string,
  parseFrontmatter: FrontmatterParser<TFrontmatter>
): Promise<ContentItem<TFrontmatter>> {
  const source = await fs.readFile(sourcePath, 'utf8');
  const parsed = matter(source);
  const frontmatter = parseFrontmatter(parsed.data, sourcePath);
  const html = String(await remark().use(remarkHtml).process(parsed.content));

  return {
    ...frontmatter,
    slug,
    content: parsed.content,
    html,
  };
}
