'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface AIVibeChangeProps {
  siteId: string;
  /** Called after a successful redesign so the parent can refresh the preview. */
  onApplied?: (presetId: string) => void;
}

/**
 * V2 Theme System - Phase 5.
 * "AI로 분위기 바꾸기" trigger. The user types a desired mood and the AI picks
 * the single best design preset. On success the parent refreshes the preview.
 */
export function AIVibeChange({ siteId, onApplied }: AIVibeChangeProps) {
  const toast = useToast();
  const [request, setRequest] = useState('');
  const [pending, setPending] = useState(false);

  const apply = async () => {
    const trimmed = request.trim();
    if (!trimmed || pending) return;

    setPending(true);
    try {
      const response = await fetch('/api/ai/redesign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, request: trimmed }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        presetId?: string;
        preset?: { name?: string };
      };

      if (response.ok && result.success) {
        toast.addToast(
          `AI가 '${result.preset?.name ?? result.presetId}' 프리셋으로 분위기를 바꿨어요!`,
          'success'
        );
        setRequest('');
        onApplied?.(result.presetId ?? '');
      } else {
        toast.addToast(result.message || '분위기 변경에 실패했습니다.', 'error');
      }
    } catch {
      toast.addToast('분위기 변경 중 오류가 발생했습니다.', 'error');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Sparkles
          aria-hidden="true"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-amber-700"
        />
        <input
          type="text"
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') apply();
          }}
          placeholder="예: 호텔처럼 고급스럽게 해줘"
          disabled={pending}
          className="w-full rounded-sm border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700 disabled:opacity-60"
        />
      </div>
      <button
        type="button"
        onClick={apply}
        disabled={pending || !request.trim()}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm bg-gradient-to-r from-amber-800 to-amber-900 px-5 py-2.5 text-sm font-bold text-[#fffdf8] shadow-md shadow-amber-900/20 transition-all hover:from-amber-700 hover:to-amber-800 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={18} />
        ) : (
          <Sparkles aria-hidden="true" size={18} />
        )}
        {pending ? 'AI가 분석 중...' : '✨ AI로 분위기 바꾸기'}
      </button>
    </div>
  );
}
