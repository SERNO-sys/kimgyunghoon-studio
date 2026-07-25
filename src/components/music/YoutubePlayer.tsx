interface YoutubePlayerProps {
  title: string;
  youtubeId: string;
}

export function YoutubePlayer({ title, youtubeId }: YoutubePlayerProps) {
  if (!youtubeId) {
    return (
      <div className="flex aspect-video items-center justify-center border border-stone-200 bg-stone-100 px-6 text-center text-sm text-stone-600">
        재생 가능한 영상이 아직 등록되지 않았습니다.
      </div>
    );
  }

  return (
    <div className="aspect-video overflow-hidden bg-stone-950">
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="size-full"
        referrerPolicy="strict-origin-when-cross-origin"
        src={`https://www.youtube.com/embed/${youtubeId}`}
        title={`${title} YouTube player`}
      />
    </div>
  );
}
