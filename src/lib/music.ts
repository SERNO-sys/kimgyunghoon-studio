import { access } from 'node:fs/promises';
import path from 'node:path';

import {
  getBoolean,
  getMarkdownSlugs,
  getString,
  getStringArray,
  parseMarkdownFile,
} from './markdown';
import type { Frontmatter } from '../types/common';
import type { MusicFrontmatter, MusicItem } from '../types/music';

const musicDirectory = path.join(process.cwd(), 'content', 'music');

function parseMusicFrontmatter(data: Frontmatter, sourcePath: string): MusicFrontmatter {
  return {
    title: getString(data, 'title', sourcePath),
    date: getString(data, 'date', sourcePath),
    description: getString(data, 'description', sourcePath),
    youtubeId: getString(data, 'youtubeId', sourcePath),
    coverImage: getString(data, 'coverImage', sourcePath),
    featured: getBoolean(data, 'featured', sourcePath),
    relatedDiarySlugs: getStringArray(data, 'relatedDiarySlugs', sourcePath),
  };
}

export async function getAllMusic(): Promise<MusicItem[]> {
  const slugs = await getMarkdownSlugs(musicDirectory);
  const music = await Promise.all(slugs.map((slug) => getMusicBySlug(slug)));

  return music
    .filter((item): item is MusicItem => item !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getMusicBySlug(slug: string): Promise<MusicItem | null> {
  const sourcePath = path.join(musicDirectory, `${slug}.md`);

  try {
    await access(sourcePath);
  } catch {
    return null;
  }

  return parseMarkdownFile(sourcePath, slug, parseMusicFrontmatter);
}
