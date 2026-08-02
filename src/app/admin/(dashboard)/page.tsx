import Link from 'next/link';
import { FileText, Image as ImageIcon, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  countMediaBySite,
  countPostsBySite,
  listSitesByOwner,
} from '@/lib/db/queries';
import { SyncStatus } from '@/components/admin/dashboard/SyncStatus';
import { AIQuickGenerate } from '@/components/admin/dashboard/AIQuickGenerate';

export const runtime = 'edge';


const quickLinks = [
  { label: 'Create Post', href: '/admin/posts/new' },
  { label: 'Upload Media', href: '/admin/media' },
  { label: 'Edit Navigation', href: '/admin/settings' },
  { label: 'Deploy Site', href: '/admin/deployment' },
];

export default async function AdminDashboardPage() {
  const session = await getSession();
  const db = getDb();
  const sites = session ? await listSitesByOwner(db, session.userId) : [];
  const site = sites[0];

  const stats = site
    ? [
        {
          label: 'Posts',
          value: String(await countPostsBySite(db, site.id)),
          icon: FileText,
        },
        {
          label: 'Media',
          value: String(await countMediaBySite(db, site.id)),
          icon: ImageIcon,
        },
        {
          label: 'Site',
          value: site.name,
          icon: Settings,
        },
      ]
    : [
        { label: 'Posts', value: '0', icon: FileText },
        { label: 'Media', value: '0', icon: ImageIcon },
        { label: 'Site', value: '—', icon: Settings },
      ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          {site ? site.name : 'Dashboard'}
        </h1>
        <p className="mt-2 text-stone-600">
          {site
            ? site.description
            : 'Manage your site content and configuration.'}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="flex flex-row items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-500">
                  {stat.label}
                </p>
                <p className="mt-1 truncate font-serif text-2xl font-semibold text-stone-950">
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
