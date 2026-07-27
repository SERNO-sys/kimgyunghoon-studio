import type { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import type { SetupSchema } from '@/lib/admin/setup';

interface ThemeStepProps {
  form: UseFormReturn<SetupSchema>;
}

const themes = [
  { value: 'default', label: 'Warm Stone (Default)' },
  { value: 'dark', label: 'Dark Mode' },
  { value: 'warm', label: 'Warm Accent' },
];

export function ThemeStep({ form }: ThemeStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-stone-950">
        Theme Selection
      </h2>
      <div>
        <Label htmlFor="theme">Theme</Label>
        <Select id="theme" {...form.register('theme')}>
          {themes.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
