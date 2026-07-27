import { z } from 'zod';

export const settingsSchema = z.object({
  general: z.object({
    name: z.string().min(1, 'Site name is required').max(100),
    description: z.string().max(500),
    language: z.enum(['ko', 'en']),
    timezone: z.string().min(1, 'Timezone is required'),
    maintenance: z.boolean(),
  }),
  contact: z.object({
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    youtube: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
    instagram: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
    twitter: z.union([z.literal(''), z.string().url('Must be a valid URL')]),
  }),
  analytics: z.object({
    googleAnalyticsId: z.string().optional(),
  }),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
