import Link from 'next/link';
import {
  Eye,
  FileText,
  Globe,
  Image as ImageIcon,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react';


import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  countMediaBySite,
  countPostsBySite,
  getPrimaryDomain,
  listSitesByOwner,
} from '@/lib/db/queries';
import { AIQuickGenerate } from '@/components/admin/dashboard/AIQuickGenerate';
import { DeleteSiteButton } from '@/components/admin/sites/DeleteSiteButton';
import type { Site } from '@/lib/db/types';


export const runtime = 'edge';


const quickLinks = [
  { label: 'Create Post', href: '/admin/posts/new' },
  { label: 'Upload Media', href: '/admin/media' },
  { label: 'Edit Navigation', href: '/admin/settings' },
  { label: 'Deploy Site', href: '/admin/deployment' },
];

/** Formats an ISO timestamp into a short, human-readable date. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * AWIE V2 - Phase 20.2: Multi-project Dashboard.
 *
 * Lists every site owned by the current user as a project card grid. Each card
 * surfaces the project's status (Live/Draft), primary domain, and last-updated
 * date, with per-card actions (Open/Preview + Delete).
 *
 * ARCHITECTURAL BOUNDARY:
 *   - This is a server component that renders a read-only snapshot of the
 *     user's projects. It NEVER composes or mutates ThemeConfig.
 *   - Mutations (delete) are delegated to the existing Dumb Client
 *     `DeleteSiteButton`, which calls the server route. No business logic leaks
 *     into the client.
 */
export default async function AdminDashboardPage() {
  const session = await getSession();
  const db = getDb();
  const sites = session ? await listSitesByOwner(db, session.userId) : [];

  // Resolve the primary domain for each project so the list can show a
  // human-readable URL at a glance.
  const projects = await Promise.all(
    sites.map(async (site) => {
      const primary = await getPrimaryDomain(db, site.id);
      return { site, domain: primary?.domain ?? null };
    })
  );

  const totalPosts = sites.length
    ? (await Promise.all(sites.map((s) => countPostsBySite(db, s.id)))).reduce(
        (a, b) => a + b,
        0
      )
    : 0;
  const totalMedia = sites.length
    ? (await Promise.all(sites.map((s) => countMediaBySite(db, s.id)))).reduce(
        (a, b) => a + b,
        0
      )
    : 0;

  const stats = [
    { label: 'Projects', value: String(sites.length), icon: Settings },
    { label: 'Posts', value: String(totalPosts), icon: FileText },
    { label: 'Media', value: String(totalMedia), icon: ImageIcon },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-950">
            내 사이트
          </h1>
          <p className="mt-2 text-stone-600">
            여러 프로젝트를 한 곳에서 관리하세요.
          </p>
        </div>
        <Link
          href="/admin/sites/new"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-sm bg-amber-900 px-6 py-3 text-base font-bold text-[#fffdf8] shadow-lg shadow-amber-900/20 transition-all hover:bg-amber-800 hover:shadow-xl"
        >
          <Plus aria-hidden="true" size={18} />
          새 사이트 만들기
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="flex flex-col gap-4 border-amber-900/20 bg-gradient-to-r from-amber-50 to-[#fffdf8] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex size-12 shrink-0 items-center justify-center rounded-sm bg-amber-900 text-[#fffdf8]">
              <Sparkles aria-hidden="true" size={24} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-950">
                첫 사이트를 만들어 보세요
              </h2>
              <p className="text-sm text-stone-600">
                AI가 몇 가지 질문을 바탕으로 맞춤형 사이트를 생성합니다.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/admin/sites/new"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-sm bg-amber-900 px-6 py-3 text-base font-bold text-[#fffdf8] shadow-lg shadow-amber-900/20 transition-all hover:bg-amber-800 hover:shadow-xl"
            >
              <Plus aria-hidden="true" size={18} />
              사이트 만들기
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(({ site, domain }) => (
            <ProjectCard key={site.id} site={site} domain={domain} />
          ))}
        </div>
      )}

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
        <AIQuickGenerate />
      </div>
    </div>
  );
}

/** A single project card in the multi-project dashboard. */
function ProjectCard({ site, domain }: { site: Site; domain: string | null }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-serif text-lg font-semibold text-stone-950">
            {site.name}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-stone-600">
            {site.description || '설명 없음'}
          </p>
        </div>
        <Badge
          className={
            site.isPublished
              ? 'border-emerald-800/20 bg-emerald-50 text-emerald-900'
              : 'border-stone-300 bg-stone-100 text-stone-600'
          }
        >
          {site.isPublished ? 'Live' : 'Draft'}
        </Badge>

      </div>

      <div className="flex flex-col gap-1 text-sm text-stone-500">
        {domain && (
          <span className="inline-flex items-center gap-1.5 truncate">
            <Globe aria-hidden="true" size={14} />
            {domain}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Settings aria-hidden="true" size={14} />
          업데이트: {formatDate(site.updatedAt)}
        </span>
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-stone-100 pt-3 sm:flex-row sm:items-center">
        <Link
          href={`/admin/sites/${site.id}`}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-amber-900 px-4 py-2.5 text-sm font-bold text-[#fffdf8] transition-colors hover:bg-amber-800"
        >
          <Eye aria-hidden="true" size={16} />
          미리보기 & 발행
        </Link>
        <DeleteSiteButton siteId={site.id} siteName={site.name} compact />
      </div>
    </Card>
  );
}
