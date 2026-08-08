import type { ThemeConfig } from '@/types/site';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'editor';
  createdAt: string;
  updatedAt: string;
}

export interface Site {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  language: 'ko' | 'en';
  timezone: string;
  theme: 'default' | 'dark' | 'warm' | 'minimal';
  /**
   * V2 Theme System - Phase 1.
   * Optional design-system config. When absent, consumers fall back to the
   * DEFAULT_PRESET so existing sites render exactly as before (non-breaking).
   */
  themeConfig?: ThemeConfig;
  maintenance: boolean;
  isPublished: boolean;
  deployVersion: string;
  createdAt: string;
  updatedAt: string;
}



export interface Domain {
  id: string;
  siteId: string;
  domain: string;
  verified: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  status: 'draft' | 'published' | 'scheduled';
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


export interface Media {
  id: string;
  siteId: string;
  name: string;
  type: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface SitePage {
  id: string;
  label: string;
  path: string;
  type: 'home' | 'music' | 'diary' | 'about' | 'contact' | 'custom';
  visible: boolean;
  order: number;
  content?: string;
  parentId?: string;
  children?: SitePage[];
}

export interface Category {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  parentId?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  id: string; // same as siteId; kept for generic table compatibility
  siteId: string;
  general: string;
  contact: string;
  analytics: string;
  social: string;
  pages: string;
  updatedAt: string;
}

export interface DeployVersion {
  id: string;
  siteId: string;
  version: string;
  snapshot: string;
  createdAt: string;
}

export interface Table<T extends { id: string }> {
  findMany(filter?: Partial<T>): Promise<T[]>;
  findOne(filter: Partial<T>): Promise<T | null>;
  findById(id: string): Promise<T | null>;
  /**
   * Returns rows whose `id` starts with the given prefix. Used for efficient
   * subdomain resolution (e.g. `e801f11c` -> site id `e801f11c-...`).
   */
  findByPrefix(prefix: string): Promise<T[]>;
  insert(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}


export interface Db {
  users: Table<User>;
  sites: Table<Site>;
  domains: Table<Domain>;
  posts: Table<Post>;
  media: Table<Media>;
  categories: Table<Category>;
  settings: Table<SiteSettings>;
  deployVersions: Table<DeployVersion>;
}
