import type { ContentItem } from './common.js';

export interface MusicFrontmatter {
  title: string;
  date: string;
  description: string;
  youtubeId: string;
  coverImage: string;
  featured: boolean;
  relatedDiarySlugs: string[];
}

export type MusicItem = ContentItem<MusicFrontmatter>;
