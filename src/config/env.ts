import { z } from 'zod';
import { getRequestContext } from '@cloudflare/next-on-pages';

if (typeof window !== 'undefined') {
  throw new Error(
    'env.ts must only be used on the server. Never expose API keys or secrets to the client.'
  );
}

function getRuntimeEnv(): Record<string, unknown> {
  const nodeEnv =
    typeof process !== 'undefined' && process.env ? (process.env as Record<string, unknown>) : {};

  try {
    const requestEnv = getRequestContext().env as Record<string, unknown>;
    return { ...nodeEnv, ...requestEnv };
  } catch {
    return nodeEnv;
  }
}

// All optional so that the public site can boot even when optional
// integrations (Google OAuth, GitHub, Gemini, Cloudflare API) are not
// configured yet. Individual features validate their own required vars.
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  SESSION_SECRET: z.string().min(32).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url()
    .optional()
    .default('http://localhost:3000/api/auth/callback'),
  NEXTAUTH_URL: z
    .string()
    .url()
    .optional()
    .default('http://localhost:3000'),
  GEMINI_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  GITHUB_BRANCH: z.string().optional().default('main'),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_PROJECT_NAME: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  // Platform host used by the middleware to distinguish the platform itself
  // from tenant subdomains (e.g. <siteId>.lucidworker.com). Defaults to the
  // production platform host.
  PLATFORM_HOST: z.string().optional().default('lucidworker.com'),
  // Public-facing platform domain used to build tenant subdomain URLs such as
  // https://<siteId>.lucidworker.com. Defaults to the production platform host.
  NEXT_PUBLIC_APP_DOMAIN: z.string().optional().default('lucidworker.com'),
});



type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Returns the merged runtime environment.
 *
 * This function never throws for missing optional integration secrets so that
 * the public site and middleware can boot even when Google/GitHub/Gemini are
 * not configured. Callers that genuinely require a secret (e.g. session
 * signing, OAuth) should validate it themselves and fail gracefully.
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(getRuntimeEnv());
  if (!result.success) {
    // Never crash the whole site because of a misconfigured optional var.
    // Fall back to defaults so the public routes still render.
    cachedEnv = envSchema.parse({});
    return cachedEnv;
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * Returns the session signing secret, or null if none is configured.
 * Callers should handle the null case (e.g. treat as "no valid session").
 */
export function getSessionSecret(): string | null {
  const env = getEnv();
  return (
    env.SESSION_SECRET ||
    env.AUTH_SECRET ||
    env.NEXTAUTH_SECRET ||
    null
  );
}

