import { getEnv } from '@/config/env';
import type { DeploymentRecord } from './types';

interface CloudflareConfig {
  accountId: string;
  projectName: string;
  apiToken: string;
}

export function getCloudflareConfig(): CloudflareConfig | null {
  const {
    CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_PROJECT_NAME,
    CLOUDFLARE_API_TOKEN,
  } = getEnv();

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_PROJECT_NAME || !CLOUDFLARE_API_TOKEN) {
    return null;
  }

  return {
    accountId: CLOUDFLARE_ACCOUNT_ID,
    projectName: CLOUDFLARE_PROJECT_NAME,
    apiToken: CLOUDFLARE_API_TOKEN,
  };
}

export async function triggerPagesDeploy(
  commitHash: string
): Promise<DeploymentRecord> {
  const config = getCloudflareConfig();

  const record: DeploymentRecord = {
    id: crypto.randomUUID(),
    commitHash,
    status: 'waiting',
    startedAt: new Date().toISOString(),
  };

  if (!config) {
    // Mock response when Cloudflare credentials are not configured.
    record.status = 'success';
    record.completedAt = new Date().toISOString();
    record.durationMs = 2500;
    return record;
  }

  // TODO: call Cloudflare Pages API to trigger deployment and poll status.
  record.status = 'success';
  record.completedAt = new Date().toISOString();
  record.durationMs = 2500;
  return record;
}
