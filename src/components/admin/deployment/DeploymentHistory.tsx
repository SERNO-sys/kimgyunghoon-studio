import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import type { DeploymentRecord } from '@/lib/cloudflare/types';

interface DeploymentHistoryProps {
  deployments: DeploymentRecord[];
  isLoading: boolean;
  onRollback: () => void;
}

export function DeploymentHistory({
  deployments,
  isLoading,
  onRollback,
}: DeploymentHistoryProps) {
  const rollback = async (id: string) => {
    await fetch(`/api/admin/deployment?id=${id}`, { method: 'PUT' });
    onRollback();
  };

  return (
    <div>
      <h2 className="mb-4 font-serif text-lg font-semibold text-stone-950">
        Deployment History
      </h2>
      {isLoading ? (
        <p className="py-8 text-center text-stone-500">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Commit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell>
                  {new Date(deployment.startedAt).toLocaleString()}
                </TableCell>
                <TableCell>{deployment.version}</TableCell>
                <TableCell>{deployment.commitHash}</TableCell>
                <TableCell>{deployment.status}</TableCell>
                <TableCell>
                  {deployment.durationMs ? `${deployment.durationMs}ms` : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => rollback(deployment.id)}
                  >
                    Rollback
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {deployments.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-stone-500"
                >
                  No deployments yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
