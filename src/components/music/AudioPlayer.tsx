'use client';

interface AudioPlayerProps {
  audioUrl: string;
}

function getYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1);
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
  } catch {
    return null;
  }
  return null;
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const lower = audioUrl.toLowerCase();
  const youtubeId = getYouTubeId(audioUrl);

  if (youtubeId) {
    return (
      <iframe
        className="w-full rounded-lg aspect-video"
        src={`https://www.youtube.com/embed/${youtubeId}`}
        title="YouTube audio player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (/\.(mp3|wav|m4a|ogg|aac|flac)(\?.*)?$/.test(lower)) {
    return (
      <audio controls className="w-full rounded-lg" src={audioUrl}>
        Your browser does not support the audio element.
      </audio>
    );
  }

  return (
    <a
      href={audioUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-sm bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100 transition"
    >
      외부 음원 링크 열기 →
    </a>
  );
}
