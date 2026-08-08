'use client';

/**
 * AWIE V2 - Phase 20.1: Create Site client (Dumb Client).
 *
 * Hosts the AI Build Wizard and, on completion, commits the planned v2
 * ThemeConfig to a real Site via /api/ai/build/commit, then redirects to the
 * Preview page.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - This client NEVER composes, decides, or mutates ThemeConfig. It only
 *     relays the planned config (a snapshot) to the server and navigates.
 *   - The server owns persistence. The client owns navigation only.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AIBuildWizard } from '@/components/admin/ai/AIBuildWizard';
import type { ThemeConfig } from '@/lib/theme-config/v2/types';

interface CommitResponse {
  success: boolean;
  message?: string;
  siteId?: string;
}

interface BuildMeta {
  recipeId?: string;
  decisions: string[];
}

export function NewSiteClient() {
  const router = useRouter();
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Commits the planned config and redirects to the Preview page. */
  const handleComplete = useCallback(
    async (config: ThemeConfig, meta: BuildMeta) => {
      setCommitting(true);
      setError(null);
      try {
        const res = await fetch('/api/ai/build/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config, meta }),
        });
        const data = (await res.json()) as CommitResponse;
        if (!data.success || !data.siteId) {
          setError(data.message ?? 'Failed to create site');
          return;
        }
        router.push(`/admin/sites/${data.siteId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create site');
      } finally {
        setCommitting(false);
      }
    },
    [router]
  );


  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          사이트 만들기
        </h1>
        <p className="mt-2 text-stone-600">
          몇 가지 질문에 답하면 AWIE가 맞춤형 사이트를 생성합니다.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {committing ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-stone-700">
            사이트를 생성하고 있습니다…
          </p>
        </div>
      ) : (
        <AIBuildWizard onComplete={handleComplete} />
      )}
    </div>
  );
}
