'use client';

import dynamic from 'next/dynamic';

interface LazyYoutubePlayerProps {
  title: string;
  youtubeId: string;
}

const YoutubePlayer = dynamic(() => import('./YoutubePlayer').then((module) => module.YoutubePlayer), {
  loading: () => <div className="aspect-video animate-pulse bg-stone-100" />,
  ssr: false,
});

export function LazyYoutubePlayer(props: LazyYoutubePlayerProps) {
  return <YoutubePlayer {...props} />;
}
