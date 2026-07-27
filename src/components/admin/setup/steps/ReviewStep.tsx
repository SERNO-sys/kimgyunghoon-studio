import type { UseFormReturn } from 'react-hook-form';
import type { SetupSchema } from '@/lib/admin/setup';

interface ReviewStepProps {
  form: UseFormReturn<SetupSchema>;
}

export function ReviewStep({ form }: ReviewStepProps) {
  const values = form.getValues();

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-stone-950">
        Review
      </h2>
      <dl className="divide-y divide-stone-200 text-sm">
        <div className="py-3">
          <dt className="font-medium text-stone-500">Site Name</dt>
          <dd className="mt-0.5 text-stone-900">{values.name}</dd>
        </div>
        <div className="py-3">
          <dt className="font-medium text-stone-500">Description</dt>
          <dd className="mt-0.5 text-stone-900">{values.description}</dd>
        </div>
        <div className="py-3">
          <dt className="font-medium text-stone-500">Email</dt>
          <dd className="mt-0.5 text-stone-900">{values.contactEmail}</dd>
        </div>
        <div className="py-3">
          <dt className="font-medium text-stone-500">Phone</dt>
          <dd className="mt-0.5 text-stone-900">
            {values.contactPhone || '—'}
          </dd>
        </div>
        <div className="py-3">
          <dt className="font-medium text-stone-500">Theme</dt>
          <dd className="mt-0.5 capitalize text-stone-900">{values.theme}</dd>
        </div>
      </dl>
    </div>
  );
}
