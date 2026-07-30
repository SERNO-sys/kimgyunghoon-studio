import Link from 'next/link';

interface NavigationProps {
  items?: { href: string; label: string }[];
  onNavigate?: () => void;
}

export function Navigation({ items = [], onNavigate }: NavigationProps) {
  return (
    <nav aria-label="Main navigation">
      <ul className="flex flex-col gap-1 md:flex-row md:flex-nowrap md:items-center md:gap-7">
        {items.map((item) => (
          <li key={item.href} className="flex-shrink-0">
            <Link
              className="block whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium tracking-wide text-current/80 transition-colors hover:bg-current/5 hover:text-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 md:px-0 md:py-1"
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
