'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DeploymentHistory } from '@/components/admin/deployment/DeploymentHistory';
import { DeploymentStatus } from '@/components/admin/deployment/DeploymentStatus';
import { useToast } from '@/hooks/useToast';
import type { DeploymentRecord } from '@/lib/cloudflare/types';

export default function DeploymentPage() {
  const toast = useToast();
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch('/api/admin/deployment')
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.deployments) {
          setDeployments(data.deployments);
        }
      })
      .catch(() => {
        toast.addToast('Failed to load deployment history.', 'error');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [reloadKey, toast]);

  const load = () => {
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  };

  const triggerDeploy = async () => {
    toast.addToast('Deployment started.', 'success');
    try {
      const response = await fetch('/api/admin/deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitHash: 'manual' }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDeployments((prev) => [data.deployment, ...prev]);
        setTimeout(() => {
          toast.addToast('Deployment completed.', 'success');
          load();
        }, 2000);
      } else {
        toast.addToast(
          data.message || 'Deployment failed.',
          'error'
        );
      }
    } catch {
      toast.addToast('Deployment failed.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-950">
            Deployment
          </h1>
          <p className="mt-2 text-stone-600">
            Save a snapshot of your site and publish changes. Roll back to any
            previous version instantly.
          </p>
        </div>
        <Button onClick={triggerDeploy}>Publish / Deploy</Button>
      </div>
      <DeploymentStatus deployments={deployments} />
      <Card className="space-y-4">
        <DeploymentHistory
          deployments={deployments}
          isLoading={isLoading}
          onRollback={load}
        />
      </Card>
    </div>
  );
}
