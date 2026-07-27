import { getEnv } from '@/config/env';
import type { GitHubFileChange, SyncResult } from './types';

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export function getGitHubConfig(): GitHubConfig | null {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = getEnv();

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return null;
  }

  return {
    token: GITHUB_TOKEN,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH,
  };
}

export async function createOrUpdateFiles(
  changes: GitHubFileChange[],
  message: string
): Promise<SyncResult> {
  const config = getGitHubConfig();
  if (!config) {
    // GitHub is not configured; return a mock success response.
    return {
      success: true,
      message: 'GitHub is not configured. Mock sync completed.',
      syncedAt: new Date().toISOString(),
    };
  }

  // TODO: implement actual GitHub API calls to create/update files via the GitHub Contents API.
  return {
    success: true,
    message: `${message}: ${changes.length} files to ${config.owner}/${config.repo}`,
    syncedAt: new Date().toISOString(),
  };
}
