'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { domainSchema } from '@/lib/admin/domain';

const TARGET = 'domains.lotusaic.com';

const DNS_PROVIDERS = [
  { name: '가비아', href: 'https://dns.gabia.com' },
  { name: '후이즈', href: 'https://domain.whois.co.kr/mywhois/dns/' },
  { name: '카페24', href: 'https://dns.cafe24.com' },
  { name: 'Cloudflare', href: 'https://dash.cloudflare.com' },
  { name: 'GoDaddy', href: 'https://dcc.godaddy.com/manage/dns' },
];

interface DomainRow {
  id: string;
  domain: string;
  verified: boolean;
  isPrimary: boolean;
}

type DomainFormData = { domain: string };

export function DomainManager() {
  const toast = useToast();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const form = useForm<DomainFormData>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain: '' },
  });

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const response = await fetch('/api/admin/publish', { method: 'POST' });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.addToast(
          '1초 만에 홈페이지가 실시간 갱신 배포되었습니다!',
          'success'
        );
      } else {
        toast.addToast(result.message || '배포에 실패했습니다.', 'error');
      }
    } catch {
      toast.addToast('배포 중 오류가 발생했습니다.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const loadDomains = useCallback(() => {
    setIsLoading(true);
    fetch('/api/admin/domain')
      .then((response) => response.json())
      .then((data) => {
        if (data.success && Array.isArray(data.domains)) {
          setDomains(data.domains);
        }
      })
      .catch(() => {
        toast.addToast('Failed to load domain status.', 'error');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [toast]);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.addToast(`${label} copied to clipboard.`, 'success');
    } catch {
      toast.addToast('Copy failed. Please copy manually.', 'error');
    }
  };

  const onSubmit = async (data: DomainFormData) => {
    toast.addToast('Registering domain...', 'success');
    try {
      const response = await fetch('/api/admin/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        form.reset();
        loadDomains();
        toast.addToast('Domain registered successfully.', 'success');
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

  const verifyDomain = async (domain: string) => {
    try {
      const response = await fetch(
        `/api/admin/domain/verify?domain=${encodeURIComponent(domain)}`
      );
      const result = await response.json();
      if (response.ok && result.success) {
        loadDomains();
        toast.addToast(
          result.verified
            ? 'Domain is connected correctly.'
            : 'CNAME record not detected yet. DNS may take a few minutes.',
          result.verified ? 'success' : 'error'
        );
      } else {
        toast.addToast(result.message || 'Verification failed.', 'error');
      }
    } catch {
      toast.addToast('Verification failed.', 'error');
    }
  };

  const handleRemoveDomain = async (id: string) => {
    try {
      const response = await fetch(
        `/api/admin/domain?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      const result = await response.json();
      if (response.ok && result.success) {
        loadDomains();
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
    <div className="space-y-8">
      <Card className="space-y-4 border-amber-200 bg-amber-50/60">
        <div>
          <h2 className="font-serif text-lg font-semibold text-amber-900">
            생초보 3초 CNAME 설정 가이드
          </h2>
          <p className="mt-1 text-sm text-amber-800/80">
            도메인 구매처 DNS 관리 페이지에서 아래 값을 그대로 입력하면
            1초 만에 연결됩니다.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 rounded-sm border border-amber-200/70 bg-[#fffdf8] p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-stone-500">Type</p>
            <code className="mt-1 inline-block rounded-sm bg-white px-2 py-1 text-sm font-bold text-stone-900 border border-stone-200">
              CNAME
            </code>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-stone-500">Name</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="inline-block rounded-sm bg-white px-2 py-1 text-sm font-bold text-stone-900 border border-stone-200">
                @
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard('@', 'Name')}
                className="text-xs text-amber-800 hover:underline"
              >
                Copy @
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-stone-500">Target</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="inline-block rounded-sm bg-white px-2 py-1 text-sm font-bold text-stone-900 border border-stone-200">
                {TARGET}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(TARGET, 'Target value')}
                className="text-xs text-amber-800 hover:underline"
              >
                Copy value
              </button>
            </div>
          </div>
        </div>
        <Button
          type="button"
          disabled={publishing}
          onClick={handlePublish}
          className="w-full sm:w-auto"
        >
          {publishing ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : (
            <Rocket aria-hidden="true" size={16} />
          )}
          {publishing ? '배포 중...' : '🚀 Publish / Update Site'}
        </Button>
      </Card>

      {domains.length > 0 && (
        <Card className="space-y-4">
          <h2 className="font-serif text-lg font-semibold text-stone-950">
            Connected Domains
          </h2>
          <ul className="divide-y divide-stone-200">
            {domains.map((domain) => (
              <li
                key={domain.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-stone-950">{domain.domain}</p>
                  <p className="text-xs text-stone-500">
                    {domain.verified ? (
                      <span className="text-green-700">Verified</span>
                    ) : (
                      <span className="text-amber-700">Pending verification</span>
                    )}{' '}
                    · {domain.isPrimary ? 'Primary' : 'Secondary'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => verifyDomain(domain.domain)}
                  >
                    Check connection
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRemoveDomain(domain.id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-6">
        <div>
          <h2 className="mb-2 font-serif text-lg font-semibold text-stone-950">
            Connect Custom Domain
          </h2>
          <p className="text-sm text-stone-600">
            Enter your own domain and point it to this service using the DNS
            records below.
          </p>
        </div>

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
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Connect Domain
          </Button>
        </form>

        <div className="rounded-sm border border-stone-200 bg-stone-50 p-4 space-y-4">
          <h3 className="font-semibold text-stone-900">DNS quick setup</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase text-stone-500">
                Record type
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded-sm bg-white px-2 py-1 text-sm font-bold text-stone-900 border border-stone-200">
                  CNAME
                </code>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-stone-500">
                Host / Name
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded-sm bg-white px-2 py-1 text-sm font-bold text-stone-900 border border-stone-200">
                  @ or www
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard('@', 'Host')}
                  className="text-xs text-amber-800 hover:underline"
                >
                  Copy @
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-stone-500">
                Value / Target
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded-sm bg-white px-2 py-1 text-sm font-bold text-stone-900 border border-stone-200">
                  {TARGET}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(TARGET, 'Target value')}
                  className="text-xs text-amber-800 hover:underline"
                >
                  Copy value
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-stone-900">Open your DNS provider</h3>
          <div className="flex flex-wrap gap-2">
            {DNS_PROVIDERS.map((provider) => (
              <a
                key={provider.name}
                href={provider.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-sm border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
              >
                {provider.name} DNS 설정 →
              </a>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
