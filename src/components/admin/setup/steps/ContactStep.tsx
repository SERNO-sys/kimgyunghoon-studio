import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { SetupSchema } from '@/lib/admin/setup';

interface ContactStepProps {
  form: UseFormReturn<SetupSchema>;
}

export function ContactStep({ form }: ContactStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-stone-950">
        Contact Information
      </h2>
      <div>
        <Label htmlFor="contactEmail">Email</Label>
        <Input
          id="contactEmail"
          type="email"
          placeholder="hello@example.com"
          {...form.register('contactEmail')}
        />
        {form.formState.errors.contactEmail && (
          <p className="mt-1 text-sm text-red-600">
            {form.formState.errors.contactEmail.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="contactPhone">Phone (optional)</Label>
        <Input
          id="contactPhone"
          type="tel"
          placeholder="+82 10-0000-0000"
          {...form.register('contactPhone')}
        />
      </div>
    </div>
  );
}
