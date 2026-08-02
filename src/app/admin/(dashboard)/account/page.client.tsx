'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { accountSchema, type AccountFormData } from '@/lib/admin/account';
import { OwnedSites } from '@/components/admin/account/OwnedSites';
import { ExportAccountData } from '@/components/admin/account/ExportAccountData';
import { DeleteAccount } from '@/components/admin/account/DeleteAccount';

const defaultValues: AccountFormData = {
  displayName: '',
  newsletter: true,
};

export default function AccountPage() {
  const toast = useToast();
  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    fetch('/api/admin/account')
      .then((res) => res.json() as Promise<{ account?: AccountFormData }>)
      .then((data) => {
        if (data.account) {
          form.reset(data.account);
        }
      })
      .catch(() => {
        // Use default values if load fails.
      });
  }, [form]);

  const onSubmit = async (data: AccountFormData) => {
    try {
      const response = await fetch('/api/admin/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };
      if (response.ok && result.success) {
        toast.addToast('Account settings saved.', 'success');
      } else {
        toast.addToast(
          result.message || 'Failed to save account settings.',
          'error'
        );
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Account Settings
        </h1>
        <p className="mt-2 text-stone-600">
          Manage your profile and preferences.
        </p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="space-y-6">
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Your display name"
              {...form.register('displayName')}
            />
            {form.formState.errors.displayName && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.displayName.message}
              </p>
            )}
          </div>

          <div>
            <Label>Profile Image</Label>
            <div className="mt-2 flex size-24 items-center justify-center rounded-full border-2 border-dashed border-stone-300 bg-stone-100 text-stone-500">
              <User aria-hidden="true" size={32} />
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Image upload will be enabled in a future phase.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...form.register('newsletter')}
                className="size-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900"
              />
              <span className="text-sm text-stone-700">
                Subscribe to newsletter
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => form.reset(defaultValues)}
            >
              Reset
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </Card>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <OwnedSites />
        <ExportAccountData />
      </div>
      <DeleteAccount />
    </div>
  );
}
