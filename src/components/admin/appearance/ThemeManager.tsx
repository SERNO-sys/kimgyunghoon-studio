'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import {
  themeSchema,
  themes,
  type ThemeFormData,
  type ThemeOption,
} from '@/lib/admin/theme';
import { ThemePreview } from './ThemePreview';

export function ThemeManager() {
  const toast = useToast();
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(themes[0]);
  const { handleSubmit, setValue } = useForm<ThemeFormData>({
    resolver: zodResolver(themeSchema),
    defaultValues: { id: themes[0].id },
  });

  useEffect(() => {
    fetch('/api/admin/theme')
      .then((res) => res.json() as Promise<{ success?: boolean; theme?: { id: string } }>)
      .then((data) => {
        if (data.theme) {
          const themeId = data.theme.id;
          const theme =
            themes.find((themeItem) => themeItem.id === themeId) ||
            themes[0];
          setSelectedTheme(theme);
          setValue('id', theme.id);
        }
      })
      .catch(() => {
        // Use default theme if load fails.
      });
  }, [setValue]);

  const selectTheme = (theme: ThemeOption) => {
    setSelectedTheme(theme);
    setValue('id', theme.id);
  };

  const onSubmit = async (data: ThemeFormData) => {
    try {
      const response = await fetch('/api/admin/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as { success?: boolean; message?: string; [key: string]: unknown };
      if (response.ok && result.success) {
        toast.addToast('Theme saved successfully.', 'success');
      } else {
        toast.addToast(
          result.message || 'Failed to save theme.',
          'error'
        );
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    }
  };

  const reset = async () => {
    try {
      const response = await fetch('/api/admin/theme', { method: 'DELETE' });
      const result = (await response.json()) as { success?: boolean; message?: string; [key: string]: unknown };
      if (response.ok && result.success) {
        setSelectedTheme(themes[0]);
        setValue('id', themes[0].id);
        toast.addToast('Theme reset to default.', 'success');
      } else {
        toast.addToast(
          result.message || 'Failed to reset theme.',
          'error'
        );
      }
    } catch {
      toast.addToast('Failed to reset theme.', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="font-serif text-lg font-semibold text-stone-950">
            Available Themes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {themes.map((theme) => {
              const isSelected = selectedTheme.id === theme.id;
              return (
                <Card
                  key={theme.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-amber-900' : ''
                  }`}
                  onClick={() => selectTheme(theme)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-stone-950">
                        {theme.name}
                      </h3>
                      <p className="mt-1 text-sm text-stone-600">
                        {theme.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check
                        className="size-5 text-amber-900"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <div
                      className="size-6 rounded-full border"
                      style={{ backgroundColor: theme.colors.background }}
                    />
                    <div
                      className="size-6 rounded-full border"
                      style={{ backgroundColor: theme.colors.foreground }}
                    />
                    <div
                      className="size-6 rounded-full border"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div
                      className="size-6 rounded-full border"
                      style={{ backgroundColor: theme.colors.card }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif text-lg font-semibold text-stone-950">
            Live Preview
          </h2>
          <ThemePreview theme={selectedTheme} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-6">
        <Button type="button" variant="secondary" onClick={reset}>
          Reset to Default
        </Button>
        <Button type="submit">Save Theme</Button>
      </div>
    </form>
  );
}
