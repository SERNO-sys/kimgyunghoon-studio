import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { SettingsFormData } from '@/lib/admin/settings';

interface AnalyticsSettingsProps {
  form: UseFormReturn<SettingsFormData>;
}

export function AnalyticsSettings({ form }: AnalyticsSettingsProps) {
  const { register } = form;

  return (
    <div>
      <Label htmlFor="analytics.googleAnalyticsId">Google Analytics ID</Label>
      <Input
        id="analytics.googleAnalyticsId"
        placeholder="G-XXXXXXXXXX"
        {...register('analytics.googleAnalyticsId')}
      />
      <p className="mt-2 text-xs text-stone-500">
        Enter your Google Analytics measurement ID.
      </p>
    </div>
  );
}
