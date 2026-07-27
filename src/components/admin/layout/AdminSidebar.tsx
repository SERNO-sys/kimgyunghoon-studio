'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  Link as LinkIcon,
  Music,
  Palette,
  Rocket,
  Settings,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/posts', label: 'Posts', icon: FileText },
  { href: '/admin/pages', label: 'Pages', icon: Globe },
  { href: '/admin/media', label: 'Media', icon: ImageIcon },
  { href: '/admin/music', label: 'Music', icon: Music },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/ai', label: 'AI Assistant', icon: Sparkles },
  { href: '/admin/appearance', label: 'Appearance', icon: Palette },
  { href: '/admin/domain', label: 'Domain', icon: LinkIcon },
  { href: '/admin/deployment', label: 'Deployment', icon: Rocket },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/account', label: 'Account', icon: User },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ isOpen, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

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
              className="font-serif text-sm font-semibold tracking-[0.1em] text-stone-50"
            >
              ADMIN
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
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-amber-900/30 text-amber-100'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-stone-50'
                      }`}
                      onClick={onToggle}
                    >
                      <Icon aria-hidden="true" size={18} />
                      {item.label}
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
