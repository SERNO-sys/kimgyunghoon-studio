import Link from 'next/link';

const navigationItems = [
  { href: '/', label: 'Home' },
  { href: '/music', label: 'Music' },
  { href: '/diary', label: 'Composition Diary' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

interface NavigationProps {
  onNavigate?: () => void;
}

export function Navigation({ onNavigate }: NavigationProps) {
  return (
    <nav aria-label="Main navigation">
      <ul className="flex flex-col gap-1 md:flex-row md:items-center md:gap-7">
        {navigationItems.map((item) => (
          <li key={item.href}>
            <Link
              className="block rounded-sm px-3 py-2 text-sm font-medium tracking-wide text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 md:px-0 md:py-1"
              href={item.href}
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
