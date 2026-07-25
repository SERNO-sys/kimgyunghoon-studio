import { getDiaryBySlug } from './diary';
import { getMusicBySlug } from './music';
import type { DiaryItem } from '../types/diary';
import type { MusicItem } from '../types/music';

export async function getRelatedDiaries(music: MusicItem): Promise<DiaryItem[]> {
  const diaries = await Promise.all(music.relatedDiarySlugs.map((slug) => getDiaryBySlug(slug)));

  return diaries.filter((diary): diary is DiaryItem => diary !== null);
}

export async function getRelatedMusic(diary: DiaryItem): Promise<MusicItem[]> {
  const music = await Promise.all(diary.relatedMusicSlugs.map((slug) => getMusicBySlug(slug)));

  return music.filter((item): item is MusicItem => item !== null);
}
