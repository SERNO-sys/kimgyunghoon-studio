import { Hero } from '@/components/sections/Hero';
import { LatestPosts } from '@/components/sections/LatestPosts';
import { Philosophy } from '@/components/sections/Philosophy';
import {
  getPublicSiteContext,
  resolveSiteConfig,
} from '@/lib/site-context';

export default async function Home() {
  const { site, settings, posts } = await getPublicSiteContext();
  const config = resolveSiteConfig(site, settings);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: config.name,
    url: site ? `/` : '',
    jobTitle: 'Creator',
    description: config.description,
  };

  return (
    <main>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      <Hero
        siteName={config.name}
        description={config.bannerDescription}
        imageUrl={config.heroImageUrl}
        themeColors={config.themeColors}
      />
      <LatestPosts
        posts={posts}
        title="Recent Updates"
        subtitle="LATEST POSTS"
        emptyText="No posts yet."
        themeColors={config.themeColors}
      />
      <Philosophy
        label={config.bannerTitle}
        title={config.heroSubtitle}
        content={config.aboutPhilosophy}
      />
    </main>
  );
}
