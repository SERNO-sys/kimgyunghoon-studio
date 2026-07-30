import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { SetupSchema } from '@/lib/admin/setup';

interface DomainStepProps {
  form: UseFormReturn<SetupSchema>;
}

export function DomainStep({ form }: DomainStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-stone-950">
        Domain
      </h2>
      <div>
        <Label htmlFor="domain">Custom Domain (optional)</Label>
        <Input
          id="domain"
          placeholder="example.com"
          {...form.register('domain')}
        />
        <p className="mt-1 text-sm text-stone-500">
          비워두면 자동으로 임시 도메인이 생성됩니다.
        </p>
        {form.formState.errors.domain && (
          <p className="mt-1 text-sm text-red-600">
            {form.formState.errors.domain.message}
          </p>
        )}
      </div>
    </div>
  );
}
