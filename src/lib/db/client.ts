import { getRequestContext } from '@cloudflare/next-on-pages';
import type {
  Db,
  User,
  Site,
  Domain,
  Post,
  Media,
  Category,
  SiteSettings,
  DeployVersion,
} from './types';
import { createInMemoryDb } from './memory';
import { createD1Table } from './d1-table';

let localDb: Db | null = null;

function createLocalDb(): Db {
  if (!localDb) {
    localDb = createInMemoryDb();
  }
  return localDb;
}

function createD1Db(d1: D1Database): Db {
  return {
    users: createD1Table<User>(d1, 'users'),
    sites: createD1Table<Site>(d1, 'sites'),
    domains: createD1Table<Domain>(d1, 'domains'),
    posts: createD1Table<Post>(d1, 'posts'),
    media: createD1Table<Media>(d1, 'media'),
    categories: createD1Table<Category>(d1, 'categories'),
    settings: createD1Table<SiteSettings>(d1, 'settings'),
    deployVersions: createD1Table<DeployVersion>(d1, 'deploy_versions'),
  };
}

/**
 * Returns a database client for the current request.
 *
 * In Cloudflare Workers/Pages this uses the D1 binding from the request context.
 * For plain `next dev` (no D1) it falls back to an in-memory store.
 */
export function getDb(): Db {
  try {
    const env = getRequestContext().env as { DB?: D1Database };
    if (env.DB) {
      return createD1Db(env.DB);
    }
  } catch {
    // Not running inside a Cloudflare Pages/Workers request context.
  }

  return createLocalDb();
}
