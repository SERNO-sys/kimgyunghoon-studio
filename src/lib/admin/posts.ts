import { z } from 'zod';

export type PostStatus = 'draft' | 'published';

export interface Post {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  category: string;
  tags: string;
  content: string;
  audioUrl?: string;
  featuredImageUrl?: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
}

export const postSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    ),
  category: z.string().min(1, 'Category is required'),
  tags: z.string().optional(),
  audioUrl: z
    .union([z.literal(''), z.string().url('Must be a valid URL')])
    .optional(),
  featuredImageUrl: z
    .union([
      z.literal(''),
      z.string().url('Must be a valid URL'),
      z.string().regex(/^\/[^\s]*$/, 'Must be a valid URL'),
    ])
    .optional(),
  content: z.string().min(1, 'Content is required'),
  status: z.enum(['draft', 'published']),
});

export type PostFormData = z.infer<typeof postSchema>;

export function parseTags(tags: string): string[] {
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatTags(tags: string[]): string {
  return tags.join(', ');
}
