import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { YTVideo } from '@/services/youtube';
import { pauseLocalPlayback } from '@/store/player';

type YouTubeState = {
  saved: YTVideo[];
  queue: YTVideo[];
  index: number;
  playVideos: (videos: YTVideo[], index: number) => void;
  next: () => boolean;
  previous: () => void;
  jumpTo: (index: number) => void;
  toggleSaved: (video: YTVideo) => void;
};

export const useYouTube = create<YouTubeState>()(
  persist(
    (set, get) => ({
      saved: [],
      queue: [],
      index: 0,
      playVideos: (videos, index) => {
        pauseLocalPlayback();
        set({ queue: videos, index });
      },
      next: () => {
        const { index, queue } = get();
        if (index >= queue.length - 1) return false;
        set({ index: index + 1 });
        return true;
      },
      previous: () => set((s) => ({ index: Math.max(0, s.index - 1) })),
      jumpTo: (index) => set({ index }),
      toggleSaved: (video) =>
        set((s) => ({
          saved: s.saved.some((v) => v.id === video.id) ? s.saved.filter((v) => v.id !== video.id) : [video, ...s.saved],
        })),
    }),
    { name: 'paadal-youtube', storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ saved: s.saved }) },
  ),
);
