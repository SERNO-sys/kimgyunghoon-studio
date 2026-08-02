'use client';

import { useState } from 'react';
import { Check, Copy, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';
import { templates } from '@/lib/ai/templates';

export function AIQuickGenerate() {
  const toast = useToast();
  const [templateKey, setTemplateKey] = useState(templates[0].key);
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

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

  return (
    <Card className="space-y-4">
      <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-stone-950">
        <Wand2 className="size-5" aria-hidden="true" />
        AI Quick Generate
      </h2>
      <div>
        <Label htmlFor="ai-widget-template">Template</Label>
        <Select
          id="ai-widget-template"
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
        <Label htmlFor="ai-widget-context">Context</Label>
        <Textarea
          id="ai-widget-context"
          rows={4}
          value={context}
          onChange={(event) => setContext(event.target.value)}
          placeholder="Enter context..."
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
          <div className="whitespace-pre-wrap rounded-sm border border-stone-200 bg-stone-50 p-4 text-sm text-stone-900">
            {result}
          </div>
          <Button variant="secondary" onClick={copy} className="gap-2">
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      )}
    </Card>
  );
}
