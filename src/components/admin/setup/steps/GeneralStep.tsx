'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import type { SetupSchema } from '@/lib/admin/setup';

interface GeneralStepProps {
  form: UseFormReturn<SetupSchema>;
}

export function GeneralStep({ form }: GeneralStepProps) {
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAutobuild = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai/autobuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const result = await response.json();

      if (response.ok && result.success && result.siteId) {
        window.location.href = '/admin';
      } else {
        setAiError(result.message || 'AI 자동 구축에 실패했습니다.');
      }
    } catch {
      setAiError('AI 자동 구축 중 오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
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
            disabled={aiLoading}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !aiLoading) {
                e.preventDefault();
                handleAutobuild();
              }
            }}
            placeholder="예: 나 20년 차 서정적인 팬플룻 음악가야"
            type="text"
            value={aiPrompt}
          />
          <Button
            disabled={aiLoading || !aiPrompt.trim()}
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
    </div>
  );
}
