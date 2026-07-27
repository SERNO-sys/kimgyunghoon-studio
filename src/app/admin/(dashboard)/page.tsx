import Link from 'next/link';
import { FileText, Image as ImageIcon, Music, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SyncStatus } from '@/components/admin/dashboard/SyncStatus';
import { AIQuickGenerate } from '@/components/admin/dashboard/AIQuickGenerate';

const stats = [
  { label: 'Music', value: '0', icon: Music },
  { label: 'Posts', value: '0', icon: FileText },
  { label: 'Media', value: '0', icon: ImageIcon },
  { label: 'Settings', value: '—', icon: Settings },
];

const quickLinks = [
  { label: 'Create Post', href: '/admin/posts/new' },
  { label: 'Upload Media', href: '/admin/media' },
  { label: 'Edit Navigation', href: '/admin/settings' },
  { label: 'Deploy Site', href: '/admin/deployment' },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Dashboard
        </h1>
        <p className="mt-2 text-stone-600">
          Manage your site content and configuration.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="flex flex-row items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-stone-500">
                  {stat.label}
                </p>
                <p className="mt-1 font-serif text-3xl font-semibold text-stone-950">
                  {stat.value}
                </p>
              </div>
              <div className="inline-flex size-10 items-center justify-center rounded-sm bg-amber-50 text-amber-900">
                <Icon aria-hidden="true" size={20} />
              </div>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-stone-950">
              Quick Actions
            </h2>
            <Badge>Admin</Badge>
          </div>
          <div className="grid gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex min-h-11 items-center justify-center rounded-sm border border-stone-300 bg-transparent px-5 py-2.5 text-sm font-semibold tracking-wide text-stone-900 transition-colors hover:border-stone-950 hover:bg-stone-950 hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Card>
        <SyncStatus />
        <AIQuickGenerate />
      </div>
    </div>
  );
}
