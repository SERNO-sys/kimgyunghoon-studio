export type DeploymentStatus = 'waiting' | 'building' | 'success' | 'failed';

export interface DeploymentRecord {
  id: string;
  commitHash: string;
  status: DeploymentStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}
