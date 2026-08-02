import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

import type { ContentItem } from '../types/common';
import type { FrontmatterParser } from './markdown';

export async function getMarkdownSlugs(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && path.extname(entry.name) === '.md')
      .map((entry) => path.basename(entry.name, '.md'));
  } catch {
    return [];
  }
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
