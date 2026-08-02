import Link from 'next/link';
import { getSession } from '@/lib/admin/session';

export const runtime = 'edge';

export const metadata = {
  title: 'LucidWorker — 나만의 홈페이지를 만드는 가장 쉬운 방법',
  description:
    'AI로 몇 분 만에 나만의 홈페이지를 만들고, 커스텀 메뉴와 콘텐츠를 자유롭게 편집하세요.',
};

export default async function PlatformLandingPage() {
  const session = await getSession();
  const dashboardHref = session ? '/admin' : '/admin/login';

  return (
    <main className="min-h-screen bg-[#f8f5ed] text-stone-900">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-sm font-bold text-white">
            L
          </span>
          <span className="font-serif text-lg font-semibold">LucidWorker</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href={dashboardHref}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
          >
            로그인
          </Link>
          <Link
            href={dashboardHref}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            시작하기
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
        <h1 className="mx-auto max-w-3xl font-serif text-4xl font-bold leading-tight sm:text-5xl">
          AI로 몇 분 만에 완성하는
          <br />
          나만의 홈페이지
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-stone-600">
          작품, 포트폴리오, 공지사항까지. 원하는 메뉴를 추가하고 콘텐츠를
          자유롭게 편집하세요. 복잡한 코딩은 필요 없습니다.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={dashboardHref}
            className="rounded-lg bg-stone-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-stone-700"
          >
            무료로 시작하기
          </Link>
          <Link
            href={dashboardHref}
            className="rounded-lg border border-stone-300 px-6 py-3 text-base font-semibold transition hover:bg-stone-100"
          >
            대시보드 열기
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: 'AI 사이트 생성',
              desc: '원하는 컨셉을 입력하면 AI가 메뉴와 콘텐츠를 자동으로 구성해 드립니다.',
            },
            {
              title: '커스텀 메뉴 편집',
              desc: '작품보기, 포트폴리오, 공지사항 등 원하는 메뉴를 자유롭게 추가하고 편집하세요.',
            },
            {
              title: '나만의 도메인',
              desc: 'lucidworker.com 서브도메인으로 바로 공개하고, 원하면 커스텀 도메인도 연결하세요.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-stone-200 bg-white p-6"
            >
              <h3 className="font-serif text-lg font-semibold">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500">
        © {new Date().getFullYear()} LucidWorker. All rights reserved.
      </footer>
    </main>
  );
}
