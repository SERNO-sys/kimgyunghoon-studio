import type { ContentItem } from './common';

export interface DiaryFrontmatter {
  number: number;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  relatedMusicSlugs: string[];
}

export type DiaryItem = ContentItem<DiaryFrontmatter>;
