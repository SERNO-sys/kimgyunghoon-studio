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

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  SESSION_SECRET: z.string().min(32).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
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
  PLATFORM_HOST: z.string().optional().default('localhost'),
});

type Env = z.infer<typeof envSchema> & {
  SESSION_SECRET: string;
};

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(getRuntimeEnv());
  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ');
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }

  const secret =
    result.data.SESSION_SECRET ||
    result.data.AUTH_SECRET ||
    result.data.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      'Missing session secret: set SESSION_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET (min 32 chars).'
    );
  }

  cachedEnv = { ...result.data, SESSION_SECRET: secret } as Env;
  return cachedEnv;
}
