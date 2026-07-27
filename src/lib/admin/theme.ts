import { z } from 'zod';

export const themeIds = ['default', 'dark', 'warm', 'minimal'] as const;

export type ThemeId = (typeof themeIds)[number];

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    card: string;
  };
}

export const themes: ThemeOption[] = [
  {
    id: 'default',
    name: 'Warm Stone',
    description: 'Default warm and organic tone for a classic feel.',
    colors: {
      background: '#f8f5ed',
      foreground: '#29241f',
      primary: '#92400e',
      card: '#fffdf8',
    },
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    description: 'High contrast dark theme for low-light environments.',
    colors: {
      background: '#0c0a09',
      foreground: '#f5f5f4',
      primary: '#fbbf24',
      card: '#1c1917',
    },
  },
  {
    id: 'warm',
    name: 'Warm Accent',
    description: 'Stronger amber accents on a light base.',
    colors: {
      background: '#fff7ed',
      foreground: '#431407',
      primary: '#c2410c',
      card: '#ffedd5',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean monochrome look with subtle contrast.',
    colors: {
      background: '#ffffff',
      foreground: '#171717',
      primary: '#404040',
      card: '#f5f5f5',
    },
  },
];

export const themeSchema = z.object({
  id: z.enum(themeIds),
});

export type ThemeFormData = z.infer<typeof themeSchema>;
