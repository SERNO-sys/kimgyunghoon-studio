import { notFound } from 'next/navigation';

import { getSiteData } from '@/lib/site-data';
import { resolveSiteConfig } from '@/lib/site-context';

export const runtime = 'edge';

interface AboutPageProps {
  params: Promise<{ siteId: string }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { siteId } = await params;
  const data = await getSiteData(siteId);
  if (!data) {
    notFound();
  }

  const config = resolveSiteConfig(data.site, data.settings);
  const aboutText = config.aboutBio;
  const profileImage =
    (data.settings
      ? JSON.parse(data.settings.general || '{}').profile_image
      : undefined) || '';
  const subHeading = config.bannerTitle || config.heroTitle;
  const philosophyText = config.aboutPhilosophy;

  const philosophyBlocks = philosophyText
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((block: string) => {
      const [title, ...body] = block.split('\n');
      return {
        title: title.trim(),
        body: body.join('\n').trim(),
      };
    });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-7 space-y-6">
          <span className="text-xs font-bold tracking-widest text-amber-800 uppercase">
            PROFILE & BIOGRAPHY
          </span>
          <h1 className="text-4xl font-serif text-stone-900 font-bold">
            {subHeading}
          </h1>
          <p className="text-stone-600 leading-relaxed whitespace-pre-line">
            {aboutText}
          </p>
        </div>
        <div className="md:col-span-5">
          <div className="relative aspect-4/3 rounded-lg overflow-hidden shadow-md bg-stone-200">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400">
                Profile Image Area
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8 border-t border-stone-200 pt-16">
        <span className="text-xs font-bold tracking-widest text-amber-800 uppercase">
          PHILOSOPHY
        </span>
        <div className="flex flex-wrap gap-6">
          {philosophyBlocks.map(
            (block: { title: string; body: string }, index: number) => (
              <div
                key={index}
                className="min-w-full flex-1 p-6 bg-stone-50 border border-stone-200/60 rounded-lg space-y-2 md:min-w-[calc(50%-0.75rem)] lg:min-w-[calc(33.333%-1rem)]"
              >
                <h3 className="font-bold text-stone-800">{block.title}</h3>
                <p className="text-sm text-stone-600 whitespace-pre-line">
                  {block.body}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
