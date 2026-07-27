'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs';
import { useToast } from '@/hooks/useToast';
import { settingsSchema, type SettingsFormData } from '@/lib/admin/settings';
import { AnalyticsSettings } from '@/components/admin/settings/AnalyticsSettings';
import { ContactSocialSettings } from '@/components/admin/settings/ContactSocialSettings';
import { GeneralSettings } from '@/components/admin/settings/GeneralSettings';

const defaultValues: SettingsFormData = {
  general: {
    name: '',
    description: '',
    language: 'ko',
    timezone: 'Asia/Seoul',
    maintenance: false,
  },
  contact: {
    email: '',
    phone: '',
    youtube: '',
    instagram: '',
    twitter: '',
  },
  analytics: {
    googleAnalyticsId: '',
  },
};

export default function SettingsPage() {
  const toast = useToast();
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          form.reset(data.settings);
        }
      })
      .catch(() => {
        // Use default values if load fails.
      });
  }, [form]);

  const onSubmit = async (data: SettingsFormData) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.addToast('Settings saved successfully.', 'success');
      } else {
        toast.addToast(
          result.message || 'Failed to save settings.',
          'error'
        );
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    }
  };

  const reset = () => {
    form.reset(defaultValues);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Site Settings
        </h1>
        <p className="mt-2 text-stone-600">
          Manage your website configuration.
        </p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="space-y-6">
          <Tabs defaultTab="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="contact">Contact & Social</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
              <GeneralSettings form={form} />
            </TabsContent>
            <TabsContent value="contact">
              <ContactSocialSettings form={form} />
            </TabsContent>
            <TabsContent value="analytics">
              <AnalyticsSettings form={form} />
            </TabsContent>
          </Tabs>
          <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-6">
            <Button type="button" variant="secondary" onClick={reset}>
              Reset
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
