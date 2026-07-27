import { Camera, ExternalLink, Mail, Music2, Play } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { siteConfig } from '@/lib/site';

const channels = [
  { label: 'YouTube', description: '음악과 작곡의 기록을 영상으로 만나보세요.', href: siteConfig.youtubeUrl, icon: Play },
  { label: 'Music Streaming', description: '발매된 음악을 스트리밍으로 감상하세요.', href: 'https://open.spotify.com', icon: Music2 },
  { label: 'Instagram', description: '새로운 소식과 일상의 영감을 나눕니다.', href: 'https://www.instagram.com', icon: Camera },
];

export default function ContactPage() {
  return (
    <main className="bg-[#f8f5ed] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">GET IN TOUCH</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Contact</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
          음악과 작업에 관한 이야기, 협업 제안은 아래 채널을 통해 전해주세요.
        </p>

        <section aria-labelledby="email-heading" className="mt-12">
          <Card className="max-w-3xl border-amber-800/20 bg-[#fffdf8] p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-900">
                  <Mail aria-hidden="true" size={20} />
                </span>
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-amber-900">OFFICIAL EMAIL</p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold text-stone-950" id="email-heading">Email</h2>
                  <p className="mt-2 leading-7 text-stone-600">작업 의뢰와 협업 문의를 이메일로 보내주세요.</p>
                </div>
              </div>
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-sm bg-stone-950 px-5 py-2.5 text-sm font-semibold tracking-wide text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                href={`mailto:${siteConfig.contactEmail}`}
              >
                {siteConfig.contactEmail}
              </a>
            </div>
          </Card>
        </section>

        <section aria-labelledby="channels-heading" className="mt-16 sm:mt-20">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">LISTEN &amp; FOLLOW</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl" id="channels-heading">
            Channels
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {channels.map((channel) => {
              const Icon = channel.icon;

              return (
                <a
                  className="group block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
                  href={channel.href}
                  key={channel.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Card className="flex h-full flex-col">
                    <span className="inline-flex size-11 items-center justify-center rounded-full bg-amber-50 text-amber-900">
                      <Icon aria-hidden="true" size={20} />
                    </span>
                    <h3 className="mt-6 font-serif text-2xl font-semibold text-stone-950">{channel.label}</h3>
                    <p className="mt-3 flex-1 leading-7 text-stone-600">{channel.description}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-900 transition-colors group-hover:text-amber-900">
                      채널 열기 <ExternalLink aria-hidden="true" size={16} />
                    </span>
                  </Card>
                </a>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
