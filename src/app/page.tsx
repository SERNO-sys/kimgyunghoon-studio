import { FeaturedMusic } from '../components/sections/FeaturedMusic';
import { Hero } from '../components/sections/Hero';
import { LatestDiary } from '../components/sections/LatestDiary';
import { Philosophy } from '../components/sections/Philosophy';
import { getAllDiaries } from '../lib/diary';
import { getAllMusic } from '../lib/music';

export default async function Home() {
  const [music, diaries] = await Promise.all([getAllMusic(), getAllDiaries()]);
  const featuredMusic = music.filter((item) => item.featured);

  return (
    <main>
      <Hero />
      <FeaturedMusic music={featuredMusic} />
      <LatestDiary diaries={diaries} />
      <Philosophy />
    </main>
  );
}
