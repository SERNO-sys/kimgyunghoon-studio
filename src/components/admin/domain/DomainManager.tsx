'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { domainSchema, type DomainConfig } from '@/lib/admin/domain';

type DomainFormData = { domain: string };

export function DomainManager() {
  const toast = useToast();
  const [currentDomain, setCurrentDomain] = useState<DomainConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<DomainFormData>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain: '' },
  });

  useEffect(() => {
    fetch('/api/admin/domain')
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setCurrentDomain(
            data.domain
              ? { domain: data.domain, sslStatus: data.sslStatus }
              : null
          );
        }
      })
      .catch(() => {
        toast.addToast('Failed to load domain status.', 'error');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [toast]);

  const onSubmit = async (data: DomainFormData) => {
    toast.addToast('DNS propagation checking...', 'success');
    try {
      const response = await fetch('/api/admin/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setCurrentDomain({
          domain: result.domain,
          sslStatus: result.sslStatus,
        });
        toast.addToast('SSL requesting...', 'success');
        setTimeout(() => {
          toast.addToast('Domain connected successfully.', 'success');
        }, 1500);
      } else {
        toast.addToast(
          result.message || 'Failed to connect domain.',
          'error'
        );
      }
    } catch {
      toast.addToast('Failed to connect domain.', 'error');
    }
  };

  const handleRemoveDomain = async () => {
    try {
      const response = await fetch('/api/admin/domain', {
        method: 'DELETE',
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setCurrentDomain(null);
        form.reset();
        toast.addToast('Domain removed.', 'success');
      } else {
        toast.addToast(
          result.message || 'Failed to remove domain.',
          'error'
        );
      }
    } catch {
      toast.addToast('Failed to remove domain.', 'error');
    }
  };

  if (isLoading) {
    return <p className="text-stone-500">Loading domain status...</p>;
  }

  return (
    <div className="space-y-6">
      {currentDomain && (
        <Card className="space-y-4">
          <h2 className="font-serif text-lg font-semibold text-stone-950">
            Current Domain
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-stone-500">
                Primary Domain
              </p>
              <p className="text-stone-950">{currentDomain.domain}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">SSL Status</p>
              <p className="capitalize text-stone-950">
                {currentDomain.sslStatus}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRemoveDomain}
          >
            Remove Domain
          </Button>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 font-serif text-lg font-semibold text-stone-950">
          Connect Custom Domain
        </h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="example.com"
              {...form.register('domain')}
            />
            {form.formState.errors.domain && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.domain.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            Connect Domain
          </Button>
        </form>
      </Card>
    </div>
  );
}
