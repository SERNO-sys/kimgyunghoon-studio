'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Eye,
  Globe,
  LayoutDashboard,
  Palette,
  Rocket,
  X,
  FileText,
  Image as ImageIcon,
  Menu,
  User,
  Mail,
} from 'lucide-react';




import type { SitePage } from '@/lib/db/types';

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  siteName?: string;
  siteId?: string;
}



function isActive(pathname: string, href: string): boolean {

  return href === '/admin'
    ? pathname === '/admin'
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  isOpen,
  onToggle,
  siteName,
  siteId,
}: AdminSidebarProps) {

  const pathname = usePathname();
  const [pages, setPages] = useState<SitePage[]>([]);

  useEffect(() => {

    fetch('/api/admin/pages', { credentials: 'same-origin' })
      .then((res) => res.json() as Promise<{ success?: boolean; pages?: SitePage[] }>)
      .then((data) => {
        if (data.success && Array.isArray(data.pages)) {
          setPages(data.pages);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const postsActive = isActive(pathname, '/admin/posts');
  const pagesActive = isActive(pathname, '/admin/pages');
  const settingsActive = isActive(pathname, '/admin/settings');
  const mediaActive = isActive(pathname, '/admin/media');

  // Fixed admin menu types are rendered as dedicated, always-visible items
  // (Dashboard, DIARY, ABOUT, CONTACT). Exclude them from the dynamic
  // custom pages list to avoid duplicate menu entries.
  const fixedTypes = new Set(['home', 'diary', 'about', 'contact']);

  const customPages = pages
    .filter((page) => page.visible !== false && !fixedTypes.has(page.type))
    .sort((a, b) => a.order - b.order);

  const sitePreviewHref = siteId ? `/admin/sites/${siteId}` : null;

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-amber-900/30 text-amber-100'
        : 'text-stone-300 hover:bg-stone-800 hover:text-stone-50'
    }`;

  const sectionLabel = (text: string) => (
    <div className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-stone-500">
      {text}
    </div>
  );

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-stone-950/50 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-64 transform border-r border-stone-200 bg-stone-900 text-stone-50 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-stone-800 px-4">
            <Link
              href="/admin"
              className="truncate font-serif text-sm font-semibold tracking-[0.1em] text-stone-50"
              title={siteName || 'ADMIN'}
            >
              {siteName || 'ADMIN'}
            </Link>
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex size-10 items-center justify-center rounded-sm text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-50 lg:hidden"
              aria-label="Close sidebar"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {/* MY SITE — the core homepage menus (ABOUT / DIARY / CONTACT)
                  are surfaced as dedicated, always-visible entry points so the
                  user can jump straight to each management screen. */}
              <li>{sectionLabel('MY SITE')}</li>

              <li>
                <Link
                  href="/admin"
                  className={linkClass(pathname === '/admin')}
                  onClick={onToggle}
                >
                  <LayoutDashboard aria-hidden="true" size={18} />
                  Dashboard
                </Link>
              </li>

              <li>
                <Link
                  href="/admin/settings?tab=general"
                  className={linkClass(settingsActive)}
                  onClick={onToggle}
                >
                  <User aria-hidden="true" size={18} />
                  ABOUT
                </Link>
              </li>

              <li>
                <Link
                  href="/admin/posts"
                  className={linkClass(postsActive)}
                  onClick={onToggle}
                >
                  <FileText aria-hidden="true" size={18} />
                  DIARY
                </Link>
              </li>

              <li>
                <Link
                  href="/admin/settings?tab=contact"
                  className={linkClass(settingsActive)}
                  onClick={onToggle}
                >
                  <Mail aria-hidden="true" size={18} />
                  CONTACT
                </Link>
              </li>

              {/* SITE MANAGEMENT — navigation, design, media, preview, publish. */}
              <li className="pt-2">{sectionLabel('SITE MANAGEMENT')}</li>

              <li>
                <Link
                  href="/admin/pages"
                  className={linkClass(pagesActive)}
                  onClick={onToggle}
                >
                  <Menu aria-hidden="true" size={18} />
                  Edit Navigation
                </Link>
              </li>

              <li>
                <Link
                  href="/admin/settings"
                  className={linkClass(settingsActive)}
                  onClick={onToggle}
                >
                  <Palette aria-hidden="true" size={18} />
                  Design Theme
                </Link>
              </li>

              <li>
                <Link
                  href="/admin/media"
                  className={linkClass(mediaActive)}
                  onClick={onToggle}
                >
                  <ImageIcon aria-hidden="true" size={18} />
                  Media
                </Link>
              </li>

              {sitePreviewHref ? (
                <li>
                  <Link
                    href={sitePreviewHref}
                    className={linkClass(isActive(pathname, sitePreviewHref))}
                    onClick={onToggle}
                  >
                    <Eye aria-hidden="true" size={18} />
                    Site Preview
                  </Link>
                </li>
              ) : null}

              {sitePreviewHref ? (
                <li>
                  <Link
                    href={sitePreviewHref}
                    className={linkClass(isActive(pathname, sitePreviewHref))}
                    onClick={onToggle}
                  >
                    <Rocket aria-hidden="true" size={18} />
                    Publish / Update
                  </Link>
                </li>
              ) : null}

              {/* Infrastructure menus (Domain, Deployment) live in the sidebar,
                  not inside the Advanced Edit drawer, because they manage the
                  site's infra rather than its content/design. */}
              <li className="pt-2">{sectionLabel('INFRASTRUCTURE')}</li>

              <li>
                <Link
                  href="/admin/domain"
                  className={linkClass(isActive(pathname, '/admin/domain'))}
                  onClick={onToggle}
                >
                  <Globe aria-hidden="true" size={18} />
                  Domain
                </Link>
              </li>

              <li>
                <Link
                  href="/admin/deployment"
                  className={linkClass(isActive(pathname, '/admin/deployment'))}
                  onClick={onToggle}
                >
                  <Rocket aria-hidden="true" size={18} />
                  Deployment
                </Link>
              </li>

              {/* AI GENERATED PAGES — AWIE-generated custom menus. */}
              {customPages.length > 0 ? (
                <li className="pt-2">
                  {sectionLabel('AI GENERATED PAGES')}
                </li>
              ) : null}

              {customPages.map((page) => {
                const href = `/admin/pages/${encodeURIComponent(page.id)}`;
                const active = isActive(pathname, href);
                return (
                  <li key={page.id}>
                    <Link
                      href={href}
                      className={linkClass(active)}
                      onClick={onToggle}
                      title={page.label}
                    >
                      {page.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

          </nav>
          <div className="border-t border-stone-800 p-4">
            <p className="text-xs text-stone-500">Site Builder CMS V2</p>
          </div>
        </div>
      </aside>
    </>
  );
}
