import Link from 'next/link';

import { MobileMenu } from './MobileMenu';
import { Navigation } from './Navigation';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#fffdf8]/95 backdrop-blur">
      <div className="relative mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          className="font-serif text-base font-semibold tracking-[0.14em] text-stone-950 transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700 sm:text-lg"
          href="/"
        >
          KIM GYUNG HOON STUDIO
        </Link>
        <div className="hidden md:block">
          <Navigation />
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
