'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  Link as LinkIcon,
  Mail,
  Palette,
  Rocket,
  Settings,
  User,
  X,
} from 'lucide-react';

import type { SitePage } from '@/lib/db/types';

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  siteName?: string;
}


const managementItems = [
  { href: '/admin/pages', label: 'Pages', icon: Globe },
  { href: '/admin/footer', label: 'Footer', icon: LinkIcon },
  { href: '/admin/media', label: 'Media', icon: ImageIcon },
  { href: '/admin/appearance', label: 'Appearance', icon: Palette },
  { href: '/admin/domain', label: 'Domain', icon: LinkIcon },
  { href: '/admin/deployment', label: 'Deployment', icon: Rocket },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/account', label: 'Account', icon: User },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/admin'
    ? pathname === '/admin'
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ isOpen, onToggle, siteName }: AdminSidebarProps) {
  const pathname = usePathname();
  const [pages, setPages] = useState<SitePage[]>([]);
  const [isManagementOpen, setIsManagementOpen] = useState(false);

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
  const diaryActive = isActive(pathname, '/admin/posts?category=diary');

  // Fixed admin menu types are rendered as dedicated, always-visible items
  // (Dashboard, All Posts, DIARY, ABOUT, CONTACT). Exclude them from the
  // dynamic custom pages list to avoid duplicate menu entries.
  const fixedTypes = new Set(['home', 'diary', 'about', 'contact']);
  const customPages = pages
    .filter((page) => page.visible !== false && !fixedTypes.has(page.type))
    .sort((a, b) => a.order - b.order);




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
              {/* Fixed admin menus (Dashboard, All Posts, DIARY, ABOUT, CONTACT)
                  are shown first (top of the sidebar) to match the public
                  homepage header order [기본 메뉴 -> 커스텀 메뉴]. AI-generated
                  custom pages follow below. */}
              <li>
                <div className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-stone-500">
                  기본 메뉴
                </div>
              </li>

              <li>
                <Link
                  href="/admin"
                  className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname === '/admin'
                      ? 'bg-amber-900/30 text-amber-100'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-stone-50'
                  }`}
                  onClick={onToggle}
                >
                  <LayoutDashboard aria-hidden="true" size={18} />
                  Dashboard
                </Link>
              </li>

              <li>
                <Link
                  href="/admin/posts"
                  className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                    postsActive
                      ? 'bg-amber-900/30 text-amber-100'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-stone-50'
                  }`}
                  onClick={onToggle}
                >
                  <span className="flex flex-1 items-center gap-3">
                    All Posts
                  </span>
                </Link>
              </li>

              <li>
                <Link
                  href="/admin/posts?category=diary"
                  className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                    diaryActive
                      ? 'bg-amber-900/30 text-amber-100'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-stone-50'
                  }`}
                  onClick={onToggle}
                >
                  <BookOpen aria-hidden="true" size={18} />
                  DIARY
                </Link>
              </li>

              <li>
                <Link
                  href="/admin/about"
                  className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(pathname, '/admin/about')
                      ? 'bg-amber-900/30 text-amber-100'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-stone-50'
                  }`}
                  onClick={onToggle}
                >
                  <User aria-hidden="true" size={18} />
                  ABOUT
                </Link>
              </li>

              <li>
                <Link
                  href="/admin/contact"
                  className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(pathname, '/admin/contact')
                      ? 'bg-amber-900/30 text-amber-100'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-stone-50'
                  }`}
                  onClick={onToggle}
                >
                  <Mail aria-hidden="true" size={18} />
                  CONTACT
                </Link>
              </li>

              {customPages.length > 0 ? (
                <li className="pt-2">
                  <div className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-stone-500">
                    커스텀 메뉴
                  </div>
                </li>
              ) : null}

              {customPages.map((page) => {
                const href = `/admin/pages/${encodeURIComponent(page.id)}`;
                const active = isActive(pathname, href);
                return (
                  <li key={page.id}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-amber-900/30 text-amber-100'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-stone-50'
                      }`}
                      onClick={onToggle}
                      title={page.label}
                    >
                      {page.label}
                    </Link>
                  </li>
                );
              })}



              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsManagementOpen((open) => !open)}
                  className="flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-sm font-medium text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-50"
                >
                  <span>Management</span>
                  <ChevronDown
                    aria-hidden="true"
                    size={16}
                    className={`transition-transform ${isManagementOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isManagementOpen && (
                  <ul className="mt-1 space-y-1 border-l border-stone-700 pl-6 pr-2">
                    {managementItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(pathname, item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors ${
                              active
                                ? 'text-amber-100'
                                : 'text-stone-400 hover:text-stone-50'
                            }`}
                            onClick={onToggle}
                          >
                            <Icon aria-hidden="true" size={14} />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
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
