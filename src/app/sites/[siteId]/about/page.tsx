import { findPageByPath, parseSettings, resolvePages } from '@/lib/site-context';
import { getSiteData, getSettingValue } from '@/lib/site-data';

export const runtime = 'edge';


interface AboutPageProps {
  params: Promise<{ siteId: string }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { siteId } = await params;
  const data = await getSiteData(siteId);
  if (!data) return null;

  const { site, settings } = data;
  const parsed = parseSettings(settings);
  const pages = resolvePages(parsed.pages, site?.name ?? '');
  const page = findPageByPath(pages, '/about');
  const aboutText =
    getSettingValue(settings, 'about_bio') ||
    getSettingValue(settings, 'about_main_bio') ||
    getSettingValue(settings, 'about_text') ||
    '';
  const profileImage =
    getSettingValue(settings, 'profile_image') || '';
  const subHeading =
    getSettingValue(settings, 'banner_title') ||
    getSettingValue(settings, 'hero_title') ||
    getSettingValue(settings, 'about_sub_heading') ||
    '';
  const philosophyText =
    getSettingValue(settings, 'about_philosophy') ||
    getSettingValue(settings, 'philosophy_text') ||
    '';

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
      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-7 space-y-6">
          <span className="text-xs font-bold tracking-widest text-amber-800 uppercase">
            {page?.label || 'Profile & Biography'}
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

      {/* Philosophy / Timeline Section */}
      <div className="space-y-8 border-t border-stone-200 pt-16">
        <span className="text-xs font-bold tracking-widest text-amber-800 uppercase">
          {page?.content || 'Philosophy'}
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {philosophyBlocks.map((block: { title: string; body: string }, index: number) => (
            <div
              key={index}
              className="p-6 bg-amber-50/40 border-l-4 border-amber-800 space-y-2"
            >
              <h3 className="font-serif font-bold text-amber-900">{block.title}</h3>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                {block.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
