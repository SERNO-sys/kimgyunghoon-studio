import { z } from 'zod';

export type PostStatus = 'draft' | 'published' | 'scheduled';

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
  /**
   * Milestone H — Phase H.1: Scheduled Publishing.
   * ISO datetime at which a scheduled post should auto-publish. When set to a
   * future datetime, the post is held in `status = 'scheduled'` and flips to
   * `published` lazily on the next read after the due time.
   */
  scheduledAt?: string;
  /**
   * Actual datetime the post became published. Set once when the post
   * transitions to `published` (immediately or via the scheduled lazy-flip).
   */
  publishedAt?: string;
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
  status: z.enum(['draft', 'published', 'scheduled']),
  /**
   * Optional ISO datetime for scheduled publishing. When present and in the
   * future, the server holds the post in `status = 'scheduled'`.
   */
  scheduledAt: z
    .union([z.literal(''), z.string().datetime({ offset: true })])
    .optional(),
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
