import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { SetupSchema } from '@/lib/admin/setup';

interface SocialStepProps {
  form: UseFormReturn<SetupSchema>;
}

const socialFields = [
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/...' },
] as const;

export function SocialStep({ form }: SocialStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-stone-950">
        Social Links
      </h2>
      {socialFields.map(({ key, label, placeholder }) => (
        <div key={key}>
          <Label htmlFor={`social.${key}`}>{label}</Label>
          <Input
            id={`social.${key}`}
            placeholder={placeholder}
            {...form.register(`social.${key}`)}
          />
          {form.formState.errors.social?.[key] && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.social[key]?.message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
