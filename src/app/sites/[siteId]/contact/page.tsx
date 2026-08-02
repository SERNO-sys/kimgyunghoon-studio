import { Mail, Phone, Send } from 'lucide-react';

import { findPageByPath, parseSettings, resolvePages } from '@/lib/site-context';
import { getSiteData, getSettingValue } from '@/lib/site-data';

export const runtime = 'edge';


interface ContactPageProps {
  params: Promise<{ siteId: string }>;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { siteId } = await params;
  const data = await getSiteData(siteId);
  if (!data) return null;

  const { site, settings } = data;
  const parsed = parseSettings(settings);
  const pages = resolvePages(parsed.pages, site?.name ?? '');
  const page = findPageByPath(pages, '/contact');
  const pageLabel = page?.label || 'Contact';
  const pageContent = page?.content || `${site.name}에 대한 문의와 협업 제안을 환영합니다.`;
  const contactImage = getSettingValue(settings, 'contact_image') || '';
  const email = getSettingValue(settings, 'email') || '';
  const phone = getSettingValue(settings, 'phone') || '';

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 space-y-12">
      <div className="space-y-4 border-b border-stone-200 pb-8 text-center">
        <span className="text-xs font-bold tracking-widest text-amber-800 uppercase">
          {pageLabel}
        </span>
        <h1 className="text-4xl font-serif text-stone-900 font-bold">
          {pageContent}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Form */}
        <form className="space-y-6 bg-stone-50 border border-stone-200 rounded-lg p-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-bold text-stone-800">
              Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              className="w-full rounded-sm border border-stone-300 bg-[#fffdf8] px-3 py-2 text-sm text-stone-900 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-bold text-stone-800">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              className="w-full rounded-sm border border-stone-300 bg-[#fffdf8] px-3 py-2 text-sm text-stone-900 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="message"
              className="text-sm font-bold text-stone-800"
            >
              Message
            </label>
            <textarea
              id="message"
              rows={5}
              placeholder="Write your message..."
              className="w-full rounded-sm border border-stone-300 bg-[#fffdf8] px-3 py-2 text-sm text-stone-900 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-50 hover:bg-stone-800 transition"
          >
            <Send size={16} />
            Send message
          </button>
        </form>

        {/* Channels */}
        <div className="space-y-6">
          {contactImage ? (
            <div className="overflow-hidden rounded-sm border border-stone-300 bg-stone-50 shadow-sm">
              <img
                alt="Contact"
                className="aspect-[16/10] w-full object-cover"
                src={contactImage}
              />
            </div>
          ) : null}

          {phone ? (
            <a
              href={`tel:${phone}`}
              className="group block rounded-lg border border-stone-200 bg-stone-50 p-6 hover:border-amber-700/40 transition"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-900">
                  <Phone size={20} />
                </span>
                <div>
                  <h3 className="font-serif text-xl font-bold text-stone-900">
                    Phone
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">{phone}</p>
                </div>
              </div>
            </a>
          ) : null}

          {email ? (
            <a
              href={`mailto:${email}`}
              className="group block rounded-lg border border-stone-200 bg-stone-50 p-6 hover:border-amber-700/40 transition"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-900">
                  <Mail size={20} />
                </span>
                <div>
                  <h3 className="font-serif text-xl font-bold text-stone-900">
                    Email
                  </h3>
                  <p className="mt-1 text-sm text-stone-600">{email}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-800 group-hover:underline">
                    Send email →
                  </span>
                </div>
              </div>
            </a>
          ) : null}

          {!phone && !email ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-400">
              등록된 연락처가 없습니다. 설정 페이지에서 연락처를 추가해 보세요.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
