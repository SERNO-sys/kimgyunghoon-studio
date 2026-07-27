import { z } from 'zod';

export const setupSchema = z.object({
  name: z.string().min(1, 'Site name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().optional(),
  social: z.object({
    youtube: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
    instagram: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
    twitter: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
  }),
  theme: z.enum(['default', 'dark', 'warm']),
});

export type SetupSchema = z.infer<typeof setupSchema>;
