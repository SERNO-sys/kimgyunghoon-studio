export interface SyncResult {
  success: boolean;
  message: string;
  syncedAt?: string;
}

export interface GitHubFileChange {
  path: string;
  content: string;
}
