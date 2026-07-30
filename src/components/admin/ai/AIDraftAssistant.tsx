'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';

interface AIDraftAssistantProps {
  siteId: string;
  isOpen: boolean;
  onClose: () => void;
  onApply: (text: string) => void;
}

const TYPES = [
  { key: 'intro', label: '소개글 초안' },
  { key: 'menu_description', label: '메뉴 설명' },
  { key: 'notice', label: '공지사항 초안' },
  { key: 'profile', label: '프로필 문구' },
  { key: 'general', label: '일반 텍스트' },
];

export function AIDraftAssistant({
  siteId,
  isOpen,
  onClose,
  onApply,
}: AIDraftAssistantProps) {
  const toast = useToast();
  const [type, setType] = useState('general');
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  if (!isOpen) return null;

  const generate = async () => {
    if (!context.trim()) return;
    setIsGenerating(true);
    setResult('');
    try {
      const response = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, context, type }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setResult(data.result);
        setRemaining(data.usage?.remaining ?? null);
      } else {
        toast.addToast(data.message || '초안 생성에 실패했습니다.', 'error');
      }
    } catch {
      toast.addToast('초안 생성에 실패했습니다.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const apply = () => {
    if (!result) return;
    onApply(result);
    toast.addToast('에디터에 삽입했습니다.', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-sm bg-[#fffdf8] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-stone-950">
            <Sparkles className="size-5" aria-hidden="true" />
            AI 초안 도우미
          </h2>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-950"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ai-draft-type">유형</Label>
            <Select
              id="ai-draft-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {TYPES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="ai-draft-context">참고 내용</Label>
            <Textarea
              id="ai-draft-context"
              rows={6}
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="작성하고 싶은 내용이나 참고할 문구를 입력하세요..."
            />
          </div>

          <div className="flex items-center justify-between">
            <Button
              onClick={generate}
              disabled={isGenerating || !context.trim()}
            >
              {isGenerating ? '생성 중...' : '초안 생성'}
            </Button>
            {remaining !== null && (
              <span className="text-sm text-stone-500">
                남은 사용량 {remaining}회
              </span>
            )}
          </div>

          {result && (
            <div className="space-y-3">
              <Label>생성 결과</Label>
              <div className="whitespace-pre-wrap rounded-sm border border-stone-200 bg-stone-50 p-4 text-sm text-stone-900">
                {result}
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setResult('')}>
                  다시 생성
                </Button>
                <Button onClick={apply}>에디터에 삽입</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
