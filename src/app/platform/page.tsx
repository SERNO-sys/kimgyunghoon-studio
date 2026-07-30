import Link from 'next/link';

export default function PlatformLandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8f5ed] px-6 text-center">
      <div className="max-w-2xl space-y-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">
          SAAS PLATFORM
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
          Build your own homepage
        </h1>
        <p className="text-lg leading-8 text-stone-600">
          Create a website, connect your domain, and share your story — all in one place.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-stone-950 px-6 py-2.5 text-sm font-semibold tracking-wide text-stone-50 transition-colors hover:bg-stone-800"
            href="/admin/login"
          >
            Get Started
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-sm border border-stone-300 bg-transparent px-6 py-2.5 text-sm font-semibold tracking-wide text-stone-900 transition-colors hover:border-stone-950 hover:bg-stone-950 hover:text-stone-50"
            href="/admin"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
