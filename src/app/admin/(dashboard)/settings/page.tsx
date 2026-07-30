'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
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
    about_sub_heading: '',
    about_text: '',
    about_philosophy: '',
    hero_title: 'ABOUT US',
    hero_subtitle: '진정성 있는 기록과 이야기를 담아내는 공간입니다.',
    philosophy_text: '일상의 감정과 소중한 기록들을 차곡차곡 쌓아갑니다.',
    hero_image_url: '',
    profile_image: '',
    contact_image: '',
    language: 'ko',
    timezone: 'Asia/Seoul',
    maintenance: false,
  },
  contact: {
    email: '',
    phone: '',
  },
  social: {
    youtube: '',
    instagram: '',
    twitter: '',
    tiktok: '',
    facebook: '',
    soundcloud: '',
    spotify: '',
    threads: '',
  },
  analytics: {
    googleAnalyticsId: '',
  },
};

export default function SettingsPage() {
  const router = useRouter();
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

  const resetForm = () => {
    form.reset(defaultValues);
  };

  const handleResetSite = async () => {
    if (
      !window.confirm(
        '정말로 사이트를 초기화하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch('/api/admin/site/reset', {
        method: 'POST',
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.addToast('사이트가 초기화되었습니다.', 'success');
        router.push('/admin/setup');
      } else {
        toast.addToast(result.message || '초기화에 실패했습니다.', 'error');
      }
    } catch {
      toast.addToast('초기화 중 오류가 발생했습니다.', 'error');
    }
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
            <Button type="button" variant="secondary" onClick={resetForm}>
              Reset
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </Card>
      </form>

      <Card className="border-red-200 bg-red-50/50 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-red-100 p-2 text-red-600">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
            <p className="text-sm text-red-800">
              사이트를 초기화하면 사이트, 설정, 카테고리, 페이지, 포스트 등 모든
              데이터가 삭제되며 복구할 수 없습니다.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="border-red-300 bg-white text-red-700 hover:bg-red-100"
              onClick={handleResetSite}
            >
              ⚠️ 사이트 초기화 및 다시 만들기
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
