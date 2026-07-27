import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import type { SettingsFormData } from '@/lib/admin/settings';

interface GeneralSettingsProps {
  form: UseFormReturn<SettingsFormData>;
}

export function GeneralSettings({ form }: GeneralSettingsProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label htmlFor="general.name">Site Name</Label>
        <Input
          id="general.name"
          placeholder="KIM GYUNG HOON STUDIO"
          {...register('general.name')}
        />
        {errors.general?.name && (
          <p className="mt-1 text-sm text-red-600">
            {errors.general.name.message}
          </p>
        )}
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="general.description">Description</Label>
        <Textarea
          id="general.description"
          placeholder="Short description of your site"
          {...register('general.description')}
        />
      </div>
      <div>
        <Label htmlFor="general.language">Language</Label>
        <Select id="general.language" {...register('general.language')}>
          <option value="ko">Korean</option>
          <option value="en">English</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="general.timezone">Timezone</Label>
        <Input
          id="general.timezone"
          placeholder="Asia/Seoul"
          {...register('general.timezone')}
        />
        {errors.general?.timezone && (
          <p className="mt-1 text-sm text-red-600">
            {errors.general.timezone.message}
          </p>
        )}
      </div>
      <div className="md:col-span-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('general.maintenance')}
            className="size-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900"
          />
          <span className="text-sm text-stone-700">Enable maintenance mode</span>
        </label>
      </div>
    </div>
  );
}
