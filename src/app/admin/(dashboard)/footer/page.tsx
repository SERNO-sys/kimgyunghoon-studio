'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';

export const runtime = 'edge';


interface FooterFormData {
  email: string;
  phone: string;
  youtube: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  facebook: string;
  soundcloud: string;
  spotify: string;
  threads: string;
}

export default function FooterAdminPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseSettings, setBaseSettings] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<FooterFormData>({
    email: '',
    phone: '',
    youtube: '',
    instagram: '',
    twitter: '',
    tiktok: '',
    facebook: '',
    soundcloud: '',
    spotify: '',
    threads: '',
  });

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json() as Promise<{ settings?: Record<string, unknown> }>)
      .then((data) => {
        if (data?.settings) {
          setBaseSettings(data.settings);
          const contact = (data.settings.contact as Record<string, string>) || {};
          const social = (data.settings.social as Record<string, string>) || {};
          setForm({
            email: contact.email || '',
            phone: contact.phone || '',
            youtube: social.youtube || '',
            instagram: social.instagram || '',
            twitter: social.twitter || '',
            tiktok: social.tiktok || '',
            facebook: social.facebook || '',
            soundcloud: social.soundcloud || '',
            spotify: social.spotify || '',
            threads: social.threads || '',
          });
        }
      })
      .catch(() => {
        toast.addToast('Failed to load footer settings.', 'error');
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const handleChange = (field: keyof FooterFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...baseSettings,
      contact: {
        ...(baseSettings?.contact as Record<string, unknown>),
        email: form.email,
        phone: form.phone,
      },
      social: {
        youtube: form.youtube,
        instagram: form.instagram,
        twitter: form.twitter,
        tiktok: form.tiktok,
        facebook: form.facebook,
        soundcloud: form.soundcloud,
        spotify: form.spotify,
        threads: form.threads,
      },
    };

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };
      if (response.ok && result.success) {
        toast.addToast('Footer settings saved successfully.', 'success');
      } else {
        toast.addToast(result.message || 'Failed to save footer settings.', 'error');
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-stone-600">Loading footer settings...</p>;
  }

  const socialFields = [
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
    { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/...' },
    { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
    { key: 'soundcloud', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
    { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/...' },
    { key: 'threads', label: 'Threads', placeholder: 'https://threads.net/@...' },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Footer
        </h1>
        <p className="mt-2 text-stone-600">
          Manage email, phone, and social links that appear in the site footer.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <Card className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="hello@example.com"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+82 10-0000-0000"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-5 space-y-5">
            <div>
              <h3 className="font-semibold text-stone-900">Social Links</h3>
              <p className="text-sm text-stone-600">
                Only the channels you fill in will be shown as icons in the footer.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {socialFields.map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type="text"
                    placeholder={placeholder}
                    value={form[key as keyof FooterFormData]}
                    onChange={(e) => handleChange(key as keyof FooterFormData, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-6">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Footer'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
