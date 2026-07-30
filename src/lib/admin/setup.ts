import { z } from 'zod';

export const setupSchema = z.object({
  name: z.string().min(1, 'Site name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  domain: z
    .string()
    .max(253, 'Domain is too long')
    .regex(
      /^(?=.{1,253}$)[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      'Enter a valid domain, e.g. example.com'
    )
    .optional()
    .or(z.literal('')),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().optional(),
  social: z.object({
    youtube: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
    instagram: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
    twitter: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
    tiktok: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
    facebook: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
    soundcloud: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
    spotify: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
    threads: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
  }),
  theme: z.enum(['default', 'dark', 'warm']),
});

export type SetupSchema = z.infer<typeof setupSchema>;
