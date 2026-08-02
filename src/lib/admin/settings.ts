import { z } from 'zod';

export const settingsSchema = z.object({
  general: z.object({
    name: z.string().max(100),
    description: z.string().max(500),
    about_sub_heading: z.string().max(200),
    about_text: z.string().max(2000),
    about_philosophy: z.string().max(2000),
    hero_title: z.string().max(200),
    hero_subtitle: z.string().max(500),
    philosophy_text: z.string().max(2000),
    hero_image_url: z.string().max(500),
    profile_image: z.string().max(500),
    contact_image: z.string().max(500),
    language: z.enum(['ko', 'en']),
    timezone: z.string(),
    maintenance: z.boolean(),
  }),
  contact: z.object({
    email: z.string().max(200),
    phone: z.string().max(100),
  }),
  social: z.object({
    youtube: z.string().max(500),
    instagram: z.string().max(500),
    twitter: z.string().max(500),
    tiktok: z.string().max(500),
    facebook: z.string().max(500),
    soundcloud: z.string().max(500),
    spotify: z.string().max(500),
    threads: z.string().max(500),
  }),
  analytics: z.object({
    googleAnalyticsId: z.string(),
  }),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
