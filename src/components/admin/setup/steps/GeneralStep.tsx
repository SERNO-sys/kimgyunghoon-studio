'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import type { SetupSchema } from '@/lib/admin/setup';

interface GeneralStepProps {
  form: UseFormReturn<SetupSchema>;
}

/**
 * The shape of an enrichment question returned by /api/ai/autobuild.
 *
 * This is the provider-independent, semantic question metadata the UI may
 * offer AFTER the initial site is built. It is NOT a UI instruction — it is a
 * semantic slot the user can fill to enrich the site.
 */
interface EnrichmentQuestion {
  id: string;
  slot: string;
  text: string;
  intent?: string;
  gapCapability?: string;
}

/**
 * The shape of the enrichment metadata in the autobuild response.
 *
 * Enrichment is OPTIONAL and NEVER blocks one-line generation. When
 * enrichmentReady is false, the site is already complete and the panel is
 * hidden.
 */
interface EnrichmentMetadata {
  enrichmentReady: boolean;
  priority?: string;
  questions: EnrichmentQuestion[];
}

/** The shape of the /api/ai/autobuild response. */
interface AutobuildResponse {
  success?: boolean;
  message?: string;
  siteId?: string;
  enrichment?: EnrichmentMetadata;
}

/** The shape of the /api/ai/enrich/answers response. */
interface EnrichAnswersResponse {
  success?: boolean;
  message?: string;
  factValidation?: string;
  answered?: number;
}

export function GeneralStep({ form }: GeneralStepProps) {
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Enrichment state. The initial site is ALWAYS built first; enrichment is an
  // optional follow-up the user may answer, skip, or finish later.
  const [enrichment, setEnrichment] = useState<EnrichmentMetadata | null>(null);
  const [builtSiteId, setBuiltSiteId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichDone, setEnrichDone] = useState(false);

  const handleAutobuild = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setEnrichment(null);
    setBuiltSiteId(null);
    setAnswers({});
    setEnrichDone(false);

    try {
      const response = await fetch('/api/ai/autobuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const result = (await response.json()) as AutobuildResponse;

      if (response.ok && result.success && result.siteId) {
        // The site is ALREADY built and usable. Enrichment is optional.
        setBuiltSiteId(result.siteId);
        if (
          result.enrichment?.enrichmentReady &&
          result.enrichment.questions.length > 0
        ) {
          setEnrichment(result.enrichment);
        } else {
          // No high-value gaps — the site is complete. Go to the dashboard.
          window.location.href = '/admin';
        }
      } else {
        setAiError(result.message || 'AI 자동 구축에 실패했습니다.');
      }
    } catch {
      setAiError('AI 자동 구축 중 오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  /** Submits the answered questions to re-enter the Brain pipeline. */
  const handleSubmitAnswers = async () => {
    if (!builtSiteId) return;
    // Guard against duplicate submissions: once enrichment has completed (or is
    // in-flight), ignore further clicks. The site is already enriched.
    if (enrichDone || enrichLoading) return;
    setEnrichLoading(true);
    setEnrichError(null);


    // Only non-blank answers are sent. Blank answers are ignored by the
    // ingestion bridge — they never become facts.
    const submitted = (enrichment?.questions ?? [])
      .filter((q) => {
        const text = (answers[q.id] ?? '').trim();
        return text.length > 0;
      })
      .map((q) => ({
        questionId: q.id,
        slot: q.slot,
        text: answers[q.id].trim(),
      }));

    try {
      const response = await fetch(`/api/ai/enrich/answers/${builtSiteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          answers: submitted,
        }),
      });
      const result = (await response.json()) as EnrichAnswersResponse;

      if (response.ok && result.success) {
        // Regeneration succeeded — the SAME site was updated. Show the
        // completion state so the user can review the enriched result.
        setEnrichDone(true);
      } else {
        // Regeneration failed — the already-generated site is preserved and
        // remains usable. Show a recoverable error; do NOT roll back.
        setEnrichError(result.message || '사이트 보강에 실패했습니다.');
      }
    } catch {
      setEnrichError('사이트 보강 중 오류가 발생했습니다.');
    } finally {
      setEnrichLoading(false);
    }
  };

  /** Skips enrichment entirely — the site is already usable. */
  const handleSkipEnrichment = () => {
    window.location.href = '/admin';
  };

  /** Finishes later — the site is already usable; enrichment can resume later. */
  const handleLater = () => {
    window.location.href = '/admin';
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-stone-950">
          General Information
        </h2>
        <div>
          <Label htmlFor="name">Site Name</Label>
          <Input
            id="name"
            placeholder="My Site"
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Short description of your site"
            {...form.register('description')}
          />
          {form.formState.errors.description && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.description.message}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-5">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-amber-900">
          <Sparkles size={18} />
          AI 자동 사이트 구축하기
        </h3>
        <p className="mt-1 text-sm text-amber-800/80">
          한 줄의 자기소개를 입력하면 Gemini가 메뉴, 배너 문구, 어바웃 바이오를
          10초 만에 설계해줍니다.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 rounded-sm border border-stone-300 bg-[#fffdf8] px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
            disabled={aiLoading || !!enrichment}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !aiLoading && !enrichment) {
                e.preventDefault();
                handleAutobuild();
              }
            }}
            placeholder="예: 나 20년 차 서정적인 팬플룻 음악가야"
            type="text"
            value={aiPrompt}
          />
          <Button
            disabled={aiLoading || !aiPrompt.trim() || !!enrichment}
            onClick={handleAutobuild}
            type="button"
            variant="primary"
          >
            {aiLoading ? '구축 중...' : '✨ AI 자동 구축하기'}
          </Button>
        </div>
        {aiError && (
          <p className="mt-2 text-sm text-red-600">{aiError}</p>
        )}
      </div>

      {/* Optional Enrichment Panel — shown only AFTER the site is built. */}
      {enrichment && !enrichDone && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
          <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-emerald-900">
            <Wand2 size={18} />
            사이트가 생성되었습니다 — 선택적 보강
          </h3>
          <p className="mt-1 text-sm text-emerald-800/80">
            기본 사이트가 만들어졌습니다. 몇 가지만 알려주시면 내용을 더 완성할
            수 있습니다. 건너뛰어도 사이트는 그대로 사용할 수 있습니다.
          </p>

          <div className="mt-4 space-y-4">
            {enrichment.questions.map((q) => (
              <div key={q.id}>
                <label className="block text-sm font-medium text-emerald-900">
                  {q.text}
                </label>
                <textarea
                  className="mt-1 w-full rounded-sm border border-stone-300 bg-[#fffdf8] px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  rows={2}
                  value={answers[q.id] ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  placeholder="선택 사항 — 답하지 않아도 됩니다"
                />
              </div>
            ))}
          </div>

          {enrichError && (
            <p className="mt-2 text-sm text-red-600">{enrichError}</p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={enrichLoading}
              onClick={handleSubmitAnswers}
              type="button"
              variant="primary"
            >
              {enrichLoading ? '보강 중...' : '답변하기'}
            </Button>
            <Button
              disabled={enrichLoading}
              onClick={handleSkipEnrichment}
              type="button"
              variant="secondary"
            >
              건너뛰기
            </Button>
            <Button
              disabled={enrichLoading}
              onClick={handleLater}
              type="button"
              variant="secondary"
            >
              나중에 하기
            </Button>
          </div>
        </div>
      )}

      {/* Completion state — shown after a successful regeneration. */}
      {enrichment && enrichDone && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
          <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-emerald-900">
            <Wand2 size={18} />
            사이트 보강이 완료되었습니다
          </h3>
          <p className="mt-1 text-sm text-emerald-800/80">
            답변을 반영해 같은 사이트의 내용을 더 완성했습니다. 이제 사이트를
            확인하세요.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => {
                window.location.href = '/admin';
              }}
              type="button"
              variant="primary"
            >
              대시보드로 이동
            </Button>
            {builtSiteId && (
              <Button
                onClick={() => {
                  window.location.href = `/admin/sites/${builtSiteId}`;
                }}
                type="button"
                variant="secondary"
              >
                사이트 관리
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
