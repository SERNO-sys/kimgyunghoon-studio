import { Hero } from '@/components/sections/Hero';
import { LatestPosts } from '@/components/sections/LatestPosts';
import { Philosophy } from '@/components/sections/Philosophy';
import { getSiteData } from '@/lib/site-data';
import { parseSettings, resolveSiteConfig } from '@/lib/site-context';

export const runtime = 'edge';


interface SitePageProps {
  params: Promise<{ siteId: string }>;
}

/**
 * V2 modular renderer.
 *
 * Instead of hardcoding a fixed set of sections, the homepage iterates over
 * `site.themeConfig.sections` (the ordered section list the AWIE engine chose,
 * e.g. ['hero', 'about', 'gallery', 'contact']) and renders each matching
 * block. The AI-written copy lives on `site.themeConfig.content` and is used
 * to fill the hero/about text so the AI's real Korean copy shows up on screen.
 *
 * Sections that do not yet have a dedicated component fall back to a simple
 * content block so the AI's copy is still visible (the skeleton is wired even
 * if a polished component is not yet built).
 */
export default async function SitePage({ params }: SitePageProps) {
  const { siteId } = await params;
  const data = await getSiteData(siteId);
  if (!data) return null;

  const { site, settings, posts } = data;
  const parsed = parseSettings(settings);
  const config = resolveSiteConfig(site, settings);

  // AI-written copy (V2). Falls back to the legacy settings fields so existing
  // sites render exactly as before.
  const aiContent = site.themeConfig?.content;
  const heroTitle = String(
    aiContent?.hero_title ||
      parsed.general.hero_title ||
      site.name ||
      'ABOUT US'
  );
  const heroSubtitle = String(
    aiContent?.hero_subtitle ||
      parsed.general.hero_subtitle ||
      '진정성 있는 기록과 이야기를 담아내는 공간입니다.'
  );
  const aboutBio = String(
    aiContent?.about_bio ||
      parsed.general.about_bio ||
      parsed.general.about_text ||
      '일상의 감정과 소중한 기록들을 차곡차곡 쌓아갑니다.'
  );
  const description = String(
    parsed.general.description || site.description || ''
  );

  // The ordered section list chosen by the AWIE engine. Defaults to a sensible
  // set when the site has no explicit sections (legacy sites).
  const sections =
    site.themeConfig?.sections && site.themeConfig.sections.length > 0
      ? site.themeConfig.sections
      : ['hero', 'about', 'contact'];

  // Per-section placeholder copy. Each section gets its OWN text so the AI's
  // `hero_subtitle` is never copy-pasted into unrelated sections (the previous
  // bug). When the AI provides richer content later, these are the fallbacks.
  const sectionCopy: Record<string, string> = {
    hero: heroSubtitle,
    about: aboutBio,
    gallery: '작품과 순간들을 모아둔 갤러리입니다.',
    menu: '대표 메뉴와 시그니처를 소개합니다.',
    services: '제공하는 서비스와 전문 분야를 소개합니다.',
    testimonials: '고객님들의 진심 어린 이야기를 전합니다.',
    products: '대표 상품과 컬렉션을 만나보세요.',
    team: '함께하는 팀을 소개합니다.',
    partners: '함께하는 파트너와 협력사를 소개합니다.',
    faq: '자주 묻는 질문을 정리했습니다.',
    map: '찾아오시는 길을 안내합니다.',
    cta: '지금 바로 문의해 보세요.',
    blog: '새로운 소식과 이야기를 전합니다.',
    contact: config.email || '문의는 이메일로 부탁드립니다.',
  };

  return (
    <main>
      {sections.map((section) => {
        switch (section) {
          case 'hero':
            return (
              <Hero
                key={section}
                id={section}
                siteName={site.name}
                description={description}
                imageUrl={
                  String(parsed.general.hero_image_url ?? '') || '/banner.jpg'
                }
                themeColors={config.themeColors}
              />
            );
          case 'about':
            return (
              <Philosophy
                key={section}
                id={section}
                label={heroTitle}
                title={heroSubtitle}
                content={aboutBio}
              />
            );
          case 'blog':
          case 'posts':
            return (
              <LatestPosts
                key={section}
                id={section}
                posts={posts}
                emptyText=""
                themeColors={config.themeColors}
              />
            );
          case 'contact':
            return (
              <section
                key={section}
                id={section}
                className="px-6 py-16"
                style={{
                  backgroundColor: config.themeColors.background,
                  color: config.themeColors.foreground,
                }}
              >
                <h2 className="mb-4 text-2xl font-semibold">Contact</h2>
                <p className="max-w-xl text-sm leading-relaxed opacity-80">
                  {config.email || '문의는 이메일로 부탁드립니다.'}
                </p>
              </section>
            );
          default:
            // Fallback block for any section without a dedicated component yet
            // (gallery, services, testimonials, map, faq, products, team,
            // partners, cta, menu). Renders a labeled container with the
            // section's OWN copy (never the hero/about text).
            return (
              <section
                key={section}
                id={section}
                className="px-6 py-16"
                style={{
                  backgroundColor: config.themeColors.background,
                  color: config.themeColors.foreground,
                }}
              >
                <h2 className="mb-4 text-2xl font-semibold capitalize">
                  {section}
                </h2>
                <p className="max-w-xl text-sm leading-relaxed opacity-80">
                  {sectionCopy[section] || `${section} 섹션입니다.`}
                </p>
              </section>
            );
        }
      })}
    </main>
  );
}

