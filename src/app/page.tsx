import { FeaturedMusic } from '../components/sections/FeaturedMusic';
import { Hero } from '../components/sections/Hero';
import { LatestDiary } from '../components/sections/LatestDiary';
import { Philosophy } from '../components/sections/Philosophy';
import { getAllDiaries } from '../lib/diary';
import { getAllMusic } from '../lib/music';
import { siteConfig } from '../lib/site';

export default async function Home() {
  const [music, diaries] = await Promise.all([getAllMusic(), getAllDiaries()]);
  const featuredMusic = music.filter((item) => item.featured);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: '김경훈',
    url: siteConfig.url,
    jobTitle: 'Composer',
    description: siteConfig.description,
  };

  return (
    <main>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      <Hero />
      <FeaturedMusic music={featuredMusic} />
      <LatestDiary diaries={diaries} />
      <Philosophy />
    </main>
  );
}
