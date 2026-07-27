import { z } from 'zod';

export interface MediaItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  createdAt: string;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const mediaUploadSchema = z.object({
  name: z.string().min(1),
  type: z.string().refine(
    (value) => ACCEPTED_IMAGE_TYPES.includes(value),
    'Unsupported file type'
  ),
  size: z.number().max(MAX_FILE_SIZE, 'File must be smaller than 10MB'),
});

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}
