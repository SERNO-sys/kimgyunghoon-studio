import { access } from 'node:fs/promises';
import path from 'node:path';

import { getMarkdownSlugs, getNumber, getString, getStringArray, parseMarkdownFile } from './markdown';
import type { Frontmatter } from '../types/common';
import type { DiaryFrontmatter, DiaryItem } from '../types/diary';

const diaryDirectory = path.join(process.cwd(), 'content', 'diary');

function parseDiaryFrontmatter(data: Frontmatter, sourcePath: string): DiaryFrontmatter {
  return {
    number: getNumber(data, 'number', sourcePath),
    title: getString(data, 'title', sourcePath),
    date: getString(data, 'date', sourcePath),
    summary: getString(data, 'summary', sourcePath),
    tags: getStringArray(data, 'tags', sourcePath),
    relatedMusicSlugs: getStringArray(data, 'relatedMusicSlugs', sourcePath),
  };
}

export async function getAllDiaries(): Promise<DiaryItem[]> {
  const slugs = await getMarkdownSlugs(diaryDirectory);
  const diaries = await Promise.all(slugs.map((slug) => getDiaryBySlug(slug)));

  return diaries
    .filter((item): item is DiaryItem => item !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDiaryBySlug(slug: string): Promise<DiaryItem | null> {
  const sourcePath = path.join(diaryDirectory, `${slug}.md`);

  try {
    await access(sourcePath);
  } catch {
    return null;
  }

  return parseMarkdownFile(sourcePath, slug, parseDiaryFrontmatter);
}
