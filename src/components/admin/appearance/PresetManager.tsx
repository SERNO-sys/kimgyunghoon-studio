'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';

interface PresetOption {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    card: string;
  };
}

/**
 * V2 Theme System - Phase 2.
 * Admin UI for manually switching the site's design preset. Persists the
 * selection to the site's `themeConfig.presetId` via the preset API route.
 */
export function PresetManager() {
  const toast = useToast();
  const [presets, setPresets] = useState<PresetOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/theme/preset')
      .then((res) => res.json() as Promise<{ success?: boolean; presetId?: string; presets?: PresetOption[] }>)
      .then((data) => {
        if (data.presets) {
          setPresets(data.presets);
        }
        if (data.presetId) {
          setSelectedId(data.presetId);
        }
      })
      .catch(() => {
        // Use defaults if load fails.
      })
      .finally(() => setLoading(false));
  }, []);

  const selectPreset = (id: string) => {
    setSelectedId(id);
  };

  const save = async () => {
    try {
      const response = await fetch('/api/admin/theme/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId: selectedId }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };
      if (response.ok && result.success) {
        toast.addToast('Design preset saved successfully.', 'success');
      } else {
        toast.addToast(
          result.message || 'Failed to save preset.',
          'error'
        );
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-stone-600">Loading presets...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-lg font-semibold text-stone-950">
          Design Preset
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Choose a design preset to change the overall color and typography
          mood of your site.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => {
          const isSelected = selectedId === preset.id;
          return (
            <Card
              key={preset.id}
              className={`cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-amber-900' : ''
              }`}
              onClick={() => selectPreset(preset.id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-stone-950">{preset.name}</h3>
                  <p className="mt-1 text-sm text-stone-600">
                    {preset.description}
                  </p>
                </div>
                {isSelected && (
                  <Check className="size-5 text-amber-900" aria-hidden="true" />
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <div
                  className="size-6 rounded-full border"
                  style={{ backgroundColor: preset.colors.background }}
                />
                <div
                  className="size-6 rounded-full border"
                  style={{ backgroundColor: preset.colors.foreground }}
                />
                <div
                  className="size-6 rounded-full border"
                  style={{ backgroundColor: preset.colors.primary }}
                />
                <div
                  className="size-6 rounded-full border"
                  style={{ backgroundColor: preset.colors.card }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-6">
        <Button type="button" onClick={save}>
          Save Preset
        </Button>
      </div>
    </div>
  );
}
