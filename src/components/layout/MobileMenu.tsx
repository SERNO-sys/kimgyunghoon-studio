'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';

import { Navigation } from './Navigation';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-controls="mobile-navigation"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        className="inline-flex size-10 items-center justify-center rounded-sm text-stone-800 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
      </button>
      {isOpen ? (
        <div
          className="absolute inset-x-0 top-full border-y border-stone-200 bg-[#fffdf8] px-4 py-4 shadow-lg"
          id="mobile-navigation"
        >
          <Navigation onNavigate={() => setIsOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
