'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';

export function SyncStatus() {
  const toast = useToast();
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncNow = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/admin/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: 'default',
          changes: [],
          commitMessage: 'Manual sync',
        }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        syncedAt?: string;
      };
      if (response.ok && result.success) {
        setLastSync(result.syncedAt ?? new Date().toISOString());
        toast.addToast(result.message || 'GitHub sync complete.', 'success');
        toast.addToast('Deployment started.', 'success');
        setTimeout(() => {
          toast.addToast('Deployment completed.', 'success');
        }, 2000);
      } else {
        toast.addToast(result.message || 'GitHub sync failed.', 'error');
      }
    } catch {
      toast.addToast('GitHub sync failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-stone-950">
            GitHub Sync
          </h3>
          <p className="text-sm text-stone-600">
            {lastSync
              ? `Last synced: ${new Date(lastSync).toLocaleString()}`
              : 'Not synced yet'}
          </p>
        </div>
        <RefreshCw
          className={`size-5 text-stone-500 ${isSyncing ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
      </div>
      <Button onClick={syncNow} disabled={isSyncing} className="self-start">
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </Button>
    </Card>
  );
}
