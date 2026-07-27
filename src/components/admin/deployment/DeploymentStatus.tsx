import type { DeploymentRecord, DeploymentStatus as DeploymentStatusType } from '@/lib/cloudflare/types';

interface DeploymentStatusProps {
  deployments: DeploymentRecord[];
}

const statusClasses: Record<DeploymentStatusType, string> = {
  waiting: 'bg-amber-100 text-amber-900',
  building: 'bg-blue-100 text-blue-900',
  success: 'bg-green-100 text-green-900',
  failed: 'bg-red-100 text-red-900',
};

export function DeploymentStatus({ deployments }: DeploymentStatusProps) {
  const latest = deployments[0];
  const status = latest?.status ?? 'waiting';

  return (
    <div className="rounded-sm border border-stone-200 bg-[#fffdf8] p-5">
      <h2 className="font-serif text-lg font-semibold text-stone-950">
        Current Build Status
      </h2>
      <div className="mt-4 flex items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${statusClasses[status]}`}
        >
          {status}
        </span>
        {latest && (
          <span className="text-sm text-stone-600">
            Commit: {latest.commitHash}
          </span>
        )}
      </div>
    </div>
  );
}
