'use client';

import { useState } from 'react';
import { Check, Copy, Wand2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';
import { templates } from '@/lib/ai/templates';

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (text: string) => void;
  initialContext?: string;
}

export function AIGenerateModal({
  isOpen,
  onClose,
  onApply,
  initialContext = '',
}: AIGenerateModalProps) {
  const toast = useToast();
  const [templateKey, setTemplateKey] = useState(templates[0].key);
  const [context, setContext] = useState(initialContext);
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateKey, context }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        result?: string;
      };
      if (response.ok && data.success) {
        setResult(data.result ?? '');
      } else {
        toast.addToast(data.message || 'Generation failed.', 'error');
      }
    } catch {
      toast.addToast('Generation failed.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.addToast('Copy failed.', 'error');
    }
  };

  const apply = () => {
    if (onApply) {
      onApply(result);
      toast.addToast('Applied to editor.', 'success');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-sm bg-[#fffdf8] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-stone-950">
            <Wand2 className="size-5" aria-hidden="true" />
            AI Writer
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
            <Label htmlFor="ai-modal-template">Template</Label>
            <Select
              id="ai-modal-template"
              value={templateKey}
              onChange={(event) => setTemplateKey(event.target.value)}
            >
              {templates.map((template) => (
                <option key={template.key} value={template.key}>
                  {template.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ai-modal-context">Context</Label>
            <Textarea
              id="ai-modal-context"
              rows={6}
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Enter facts, themes, or existing text..."
            />
          </div>
          <Button
            onClick={generate}
            disabled={isGenerating || !context.trim()}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
          {result && (
            <div className="space-y-3">
              <Label>Result</Label>
              <div className="whitespace-pre-wrap rounded-sm border border-stone-200 bg-stone-50 p-4 text-sm text-stone-900">
                {result}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={copy} className="gap-2">
                  {copied ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                {onApply && (
                  <Button onClick={apply}>Apply to Editor</Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
