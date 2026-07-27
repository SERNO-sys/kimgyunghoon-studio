import { triggerPagesDeploy } from './client';
import type { DeploymentRecord } from './types';

const deploymentHistory: DeploymentRecord[] = [];

export async function deploy(commitHash: string): Promise<DeploymentRecord> {
  const record = await triggerPagesDeploy(commitHash);
  deploymentHistory.unshift(record);
  return record;
}

export function getDeploymentHistory(): DeploymentRecord[] {
  return deploymentHistory;
}

export function rollbackDeployment(id: string): DeploymentRecord | null {
  const deployment = deploymentHistory.find((item) => item.id === id);
  if (!deployment) {
    return null;
  }

  const rollbackRecord: DeploymentRecord = {
    id: crypto.randomUUID(),
    commitHash: deployment.commitHash,
    status: 'success',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 1000,
  };

  deploymentHistory.unshift(rollbackRecord);
  return rollbackRecord;
}
