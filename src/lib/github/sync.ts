import { verifyRepositoryOwnership } from './ownership';
import { createOrUpdateFiles } from './client';
import type { GitHubFileChange, SyncResult } from './types';

interface SyncableContent {
  path: string;
  content: string;
}

export async function syncToGitHub(
  siteId: string,
  changes: SyncableContent[],
  commitMessage: string
): Promise<SyncResult> {
  const hasOwnership = await verifyRepositoryOwnership(siteId);
  if (!hasOwnership) {
    return {
      success: false,
      message: 'Repository ownership verification failed',
    };
  }

  // TODO: transform SyncableContent into GitHubFileChange with frontmatter if needed.
  const githubChanges: GitHubFileChange[] = changes.map((change) => ({
    path: change.path,
    content: change.content,
  }));

  return createOrUpdateFiles(githubChanges, commitMessage);
}
