import { Mail, Play } from 'lucide-react';

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-950 text-stone-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p className="text-sm">© {currentYear} KIM GYUNG HOON STUDIO. All rights reserved.</p>
        <div className="flex items-center gap-2">
          <a
            aria-label="YouTube"
            className="inline-flex size-9 items-center justify-center rounded-sm transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            href="https://www.youtube.com"
            rel="noreferrer"
            target="_blank"
          >
            <Play aria-hidden="true" size={18} />
          </a>
          <a
            aria-label="Email"
            className="inline-flex size-9 items-center justify-center rounded-sm transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            href="mailto:"
          >
            <Mail aria-hidden="true" size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}
