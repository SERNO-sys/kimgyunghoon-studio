import Link from 'next/link';

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f5ed] p-4">
      <div className="w-full max-w-sm rounded-sm border border-stone-200 bg-[#fffdf8] p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-semibold text-stone-950">
          Admin Login
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Sign in with your Google account to continue.
        </p>
        <Link
          href="/api/auth/google"
          className="mt-6 inline-flex w-full min-h-11 items-center justify-center rounded-sm bg-stone-950 px-5 py-2.5 text-sm font-semibold tracking-wide text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        >
          Sign in with Google
        </Link>
        <Link
          href="/"
          className="mt-4 block text-center text-sm text-stone-500 hover:text-stone-950"
        >
          Return to public site
        </Link>
      </div>
    </div>
  );
}