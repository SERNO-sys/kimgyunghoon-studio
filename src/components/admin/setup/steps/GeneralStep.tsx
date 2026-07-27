import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import type { SetupSchema } from '@/lib/admin/setup';

interface GeneralStepProps {
  form: UseFormReturn<SetupSchema>;
}

export function GeneralStep({ form }: GeneralStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-stone-950">
        General Information
      </h2>
      <div>
        <Label htmlFor="name">Site Name</Label>
        <Input
          id="name"
          placeholder="KIM GYUNG HOON STUDIO"
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
  );
}
