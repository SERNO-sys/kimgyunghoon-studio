import { Card } from '@/components/ui/Card';
import { PagesSettings } from '@/components/admin/pages/PagesSettings';

export const runtime = 'edge';


export default function AdminPagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Pages & Navigation
        </h1>
        <p className="mt-2 text-stone-600">
          Manage menu order, add, or remove pages. Click &ldquo;Edit
          content&rdquo; on a page to open its dedicated editor.
        </p>

      </div>
      <Card className="p-6">
        <PagesSettings />
      </Card>
    </div>
  );
}
