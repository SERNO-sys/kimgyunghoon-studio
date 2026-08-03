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

/**
 * Idempotent runtime migration for the V2 Theme System.
 *
 * The `theme_config` column is defined in `schema.sql` and
 * `migrations/0006_add_site_theme_config.sql`, but if that migration was never
 * applied to a deployed D1 database, every `UPDATE sites SET theme_config = ?`
 * crashes with `SQLITE_ERROR: table sites has no column named theme_config`.
 *
 * Instead of relying on the operator to run the migration manually, we check
 * `PRAGMA table_info(sites)` on first use and add the column if it is missing.
 * This makes the schema self-healing so preset saves and AI autobuilds work on
 * any existing database.
 */
async function ensureThemeConfigColumn(d1: D1Database): Promise<void> {
  try {
    const { results } = await d1
      .prepare('PRAGMA table_info(sites)')
      .all<{ name: string }>();
    const hasColumn = results.some((col) => col.name === 'theme_config');
    if (!hasColumn) {
      await d1
        .prepare('ALTER TABLE sites ADD COLUMN theme_config TEXT')
        .run();
      console.log('[db] Added missing `theme_config` column to sites table');
    }
  } catch (error) {
    // Never let a migration failure break the request; log it so the real
    // cause is visible in the server logs instead of a generic 500.
    console.error('[db] ensureThemeConfigColumn failed:', error);
  }
}

function createD1Db(d1: D1Database): Db {
  // Fire-and-forget self-healing migration. It runs once per isolate and is
  // idempotent, so it is safe to call on every request.
  void ensureThemeConfigColumn(d1);

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
