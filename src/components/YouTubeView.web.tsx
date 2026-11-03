import { useEffect, useRef } from 'react';
import { useWindowDimensions, View } from 'react-native';

import type { YouTubeViewProps } from './YouTubeView';

// Minimal typings for the YouTube IFrame Player API.
type YTPlayer = { loadVideoById: (id: string) => void; destroy: () => void };
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number>;
      events?: { onStateChange?: (e: { data: number }) => void; onError?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReady: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiReady ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return apiReady;
}

const ENDED = 0;

/** YouTube's official IFrame player (web). The video must stay visible. */
export function YouTubeView({ videoId, onEnded, onError, maxWidth = 720 }: YouTubeViewProps) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(screenWidth, maxWidth);
  const host = useRef<HTMLDivElement | null>(null);
  const player = useRef<YTPlayer | null>(null);
  const callbacks = useRef({ onEnded, onError });
  useEffect(() => {
    callbacks.current = { onEnded, onError };
  });
  const firstVideo = useRef(videoId);

  useEffect(() => {
    let cancelled = false;
    loadApi().then((YT) => {
      if (cancelled || !host.current) return;
      const target = document.createElement('div');
      host.current.appendChild(target);
      player.current = new YT.Player(target, {
        videoId: firstVideo.current,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: {
          onStateChange: (e) => e.data === ENDED && callbacks.current.onEnded(),
          onError: (e) =>
            callbacks.current.onError?.(
              e.data === 101 || e.data === 150 ? 'The owner doesn’t allow this video to play in other apps.' : 'This video can’t be played.',
            ),
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, []);

  useEffect(() => {
    if (player.current && videoId !== firstVideo.current) player.current.loadVideoById(videoId);
    firstVideo.current = videoId;
  }, [videoId]);

  return (
    <View style={{ width, height: (width * 9) / 16, backgroundColor: '#000' }}>
      <div ref={host} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}
