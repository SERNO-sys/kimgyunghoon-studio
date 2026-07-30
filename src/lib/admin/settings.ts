import { z } from 'zod';

export const settingsSchema = z.object({
  general: z.object({
    name: z.string().max(100).default(''),
    description: z.string().max(500).default(''),
    about_sub_heading: z.string().max(200).default(''),
    about_text: z.string().max(2000).default(''),
    about_philosophy: z.string().max(2000).default(''),
    hero_title: z.string().max(200).default(''),
    hero_subtitle: z.string().max(500).default(''),
    philosophy_text: z.string().max(2000).default(''),
    hero_image_url: z.string().max(500).default(''),
    profile_image: z.string().max(500).default(''),
    contact_image: z.string().max(500).default(''),
    language: z.enum(['ko', 'en']).default('ko'),
    timezone: z.string().default('Asia/Seoul'),
    maintenance: z.boolean().default(false),
  }),
  contact: z.object({
    email: z.string().max(200).default(''),
    phone: z.string().max(100).default(''),
  }),
  social: z.object({
    youtube: z.string().max(500).default(''),
    instagram: z.string().max(500).default(''),
    twitter: z.string().max(500).default(''),
    tiktok: z.string().max(500).default(''),
    facebook: z.string().max(500).default(''),
    soundcloud: z.string().max(500).default(''),
    spotify: z.string().max(500).default(''),
    threads: z.string().max(500).default(''),
  }),
  analytics: z.object({
    googleAnalyticsId: z.string().default(''),
  }),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
