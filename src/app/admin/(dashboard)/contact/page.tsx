'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';

interface ContactFormData {
  email: string;
  phone: string;
}

export default function ContactAdminPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseSettings, setBaseSettings] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<ContactFormData>({
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json() as Promise<{ settings?: Record<string, unknown> }>)
      .then((data) => {
        if (data?.settings) {
          setBaseSettings(data.settings);
          const general = (data.settings.general as Record<string, string>) || {};
          const contact = (data.settings.contact as Record<string, string>) || {};
          setForm({
            email: contact.email || '',
            phone: contact.phone || '',
          });
        }
      })
      .catch(() => {
        toast.addToast('Failed to load contact settings.', 'error');
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const handleChange = (field: keyof ContactFormData, value: string) => {
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
      social: baseSettings?.social,
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
        toast.addToast('Contact page saved successfully.', 'success');
      } else {
        toast.addToast(result.message || 'Failed to save contact page.', 'error');
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-stone-600">Loading Contact settings...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Contact Page
        </h1>
        <p className="mt-2 text-stone-600">
          Edit your email and phone.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <Card className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="text"
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

          <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-6">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Contact Page'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
