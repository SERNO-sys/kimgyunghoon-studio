export type DeploymentStatus = 'waiting' | 'building' | 'success' | 'failed';

export interface DeploymentRecord {
  id: string;
  siteId: string;
  commitHash: string;
  version: string;
  status: DeploymentStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}
