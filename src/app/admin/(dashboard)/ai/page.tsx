import { AIQuickGenerate } from '@/components/admin/dashboard/AIQuickGenerate';

export default function AIPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          AI Assistant
        </h1>
        <p className="mt-2 text-stone-600">
          Generate and refine content with AI.
        </p>
      </div>
      <AIQuickGenerate />
    </div>
  );
}
