import { YOUTUBE_API_KEY } from '@/config';

export type YTVideo = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
};

export const thumbnailFor = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** Extracts a video id from a YouTube link (watch, youtu.be, shorts, embed, music) or a bare id. */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (ID_PATTERN.test(text)) return text;
  try {
    const url = new URL(text.startsWith('http') ? text : `https://${text}`);
    const host = url.hostname.replace(/^(www|m|music)\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1, 12);
      return ID_PATTERN.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = url.searchParams.get('v');
      if (v && ID_PATTERN.test(v)) return v;
      const match = url.pathname.match(/^\/(shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
      if (match) return match[2];
    }
  } catch {
    // not a URL
  }
  return null;
}

/** Looks up title/channel for a pasted link. Needs no API key; falls back to placeholders. */
export async function lookupVideo(id: string): Promise<YTVideo> {
  const fallback: YTVideo = { id, title: 'YouTube video', channel: 'YouTube', thumbnail: thumbnailFor(id) };
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(id))}`);
    if (!res.ok) return fallback;
    const data = (await res.json()) as { title?: string; author_name?: string };
    return { ...fallback, title: data.title || fallback.title, channel: data.author_name || fallback.channel };
  } catch {
    return fallback;
  }
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

const cache = new Map<string, YTVideo[]>();

export class YouTubeSearchError extends Error {}

/**
 * Searches embeddable music videos. Each search costs 100 units of the
 * API key's default 10,000-unit daily quota, so results are cached per query.
 */
export async function searchVideos(query: string): Promise<YTVideo[]> {
  const q = query.trim();
  if (!q || !YOUTUBE_API_KEY) return [];
  const cached = cache.get(q.toLowerCase());
  if (cached) return cached;

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    videoCategoryId: '10',
    regionCode: 'IN',
    maxResults: '20',
    q,
    key: YOUTUBE_API_KEY,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) {
    const reason = res.status === 403 ? 'YouTube search limit reached for today, or the API key is restricted.' : 'YouTube search failed.';
    throw new YouTubeSearchError(reason);
  }
  const data = (await res.json()) as {
    items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } } }[];
  };
  const videos = (data.items ?? []).flatMap((item): YTVideo[] => {
    const id = item.id?.videoId;
    if (!id) return [];
    return [{
      id,
      title: decodeEntities(item.snippet?.title ?? 'Untitled'),
      channel: decodeEntities(item.snippet?.channelTitle ?? ''),
      thumbnail: item.snippet?.thumbnails?.medium?.url ?? thumbnailFor(id),
    }];
  });
  cache.set(q.toLowerCase(), videos);
  return videos;
}
