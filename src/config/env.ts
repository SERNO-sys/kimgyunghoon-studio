import { z } from 'zod';

if (typeof window !== 'undefined') {
  throw new Error(
    'env.ts must only be used on the server. Never expose API keys or secrets to the client.'
  );
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  SESSION_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  GEMINI_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  GITHUB_BRANCH: z.string().optional().default('main'),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_PROJECT_NAME: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ');
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
