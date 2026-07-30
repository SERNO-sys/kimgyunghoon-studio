import Link from 'next/link';

import { MobileMenu } from './MobileMenu';
import { Navigation } from './Navigation';

interface HeaderProps {
  siteName?: string;
  homeHref?: string;
  navItems?: { href: string; label: string }[];
  themeColors?: {
    background: string;
    foreground: string;
    primary: string;
    card: string;
  };
}

export function Header({
  siteName = '',
  homeHref = '/',
  navItems,
  themeColors,
}: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-current/10 backdrop-blur"
      style={
        themeColors
          ? { backgroundColor: themeColors.background, color: themeColors.foreground }
          : undefined
      }
    >
      <div className="relative mx-auto flex h-18 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-7">
          <Link
            className="block whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium tracking-wide text-current/80 transition-colors hover:bg-current/5 hover:text-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 md:px-0 md:py-1"
            href={homeHref}
            aria-label={`Home - ${siteName}`}
          >
            HOME
          </Link>
          <div className="hidden min-w-0 md:block">
            <Navigation items={navItems} />
          </div>
        </div>
        <div className="absolute right-4 sm:right-6 lg:right-8">
          <MobileMenu navItems={navItems} />
        </div>
      </div>
    </header>
  );
}
