export type YouTubeLink = {
  platform: 'youtube';
  videoId: string;
  url: string;
};

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

function cleanVideoId(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/[a-zA-Z0-9_-]{11}/);
  return match?.[0] ?? null;
}

export function parseYouTubeUrl(rawUrl: string): YouTubeLink | null {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, 'www.');
  if (!YOUTUBE_HOSTS.has(host) && !YOUTUBE_HOSTS.has(url.hostname)) return null;

  let videoId: string | null = null;

  if (url.hostname === 'youtu.be') {
    videoId = cleanVideoId(url.pathname.split('/').filter(Boolean)[0] ?? null);
  } else if (url.pathname === '/watch') {
    videoId = cleanVideoId(url.searchParams.get('v'));
  } else {
    const parts = url.pathname.split('/').filter(Boolean);
    const marker = parts[0];

    if (marker === 'shorts' || marker === 'embed' || marker === 'live') {
      videoId = cleanVideoId(parts[1] ?? null);
    }
  }

  if (!videoId) return null;

  return {
    platform: 'youtube',
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
