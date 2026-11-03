import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createAudioPlayer,
  setAudioModeAsync,
  useAudioPlayerStatus,
  type AudioPlayer,
} from 'expo-audio';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { artistName, getAlbum, getTrack, type Track } from '@/data/catalog';
import { useLibrary } from '@/store/library';

export type RepeatMode = 'off' | 'all' | 'one';

type PlayerState = {
  /** Play order (shuffled when shuffle is on). */
  queue: string[];
  /** Order the queue was started in, used to restore when shuffle is turned off. */
  originalQueue: string[];
  index: number;
  contextLabel: string;
  shuffle: boolean;
  repeat: RepeatMode;
  isPlaying: boolean;
  /** Set when the current track failed to load; cleared on the next load. */
  error: string | null;

  playTracks: (tracks: Track[], startIndex?: number, contextLabel?: string, opts?: { shuffle?: boolean }) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (seconds: number) => void;
  jumpTo: (queueIndex: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (queueIndex: number) => void;
};

// ---------------------------------------------------------------------------
// Audio engine: a single AudioPlayer shared by the whole app.
// ---------------------------------------------------------------------------

let player: AudioPlayer | null = null;
let loadedTrackId: string | null = null;
let lockScreenActive = false;

export function getPlayer(): AudioPlayer {
  if (!player) {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
    player = createAudioPlayer(null, { updateInterval: 500 });
    player.addListener('playbackStatusUpdate', (status) => {
      const state = usePlayer.getState();
      if (state.isPlaying !== status.playing) usePlayer.setState({ isPlaying: status.playing });
      // `error` is reported by the web player; native players report a failed playbackState.
      const failed = !!(status as { error?: string }).error || status.playbackState === 'failed';
      if (failed && !state.error) {
        usePlayer.setState({ error: 'Couldn’t play this song. Check your connection.', isPlaying: false });
      }
      if (status.didJustFinish) handleTrackEnd();
    });
  }
  return player;
}

/** Live position/duration of the shared player, for progress UI. */
export function usePlaybackStatus() {
  return useAudioPlayerStatus(getPlayer());
}

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function load(trackId: string, autoplay: boolean) {
  const track = getTrack(trackId);
  if (!track) return;
  const p = getPlayer();
  usePlayer.setState({ error: null });
  p.replace({ uri: track.url });
  loadedTrackId = trackId;
  if (autoplay) p.play();
  useLibrary.getState().pushRecent(trackId);

  const metadata = {
    title: track.title,
    artist: artistName(track),
    albumTitle: getAlbum(track.albumId)?.title,
  };
  try {
    if (!lockScreenActive) {
      p.setActiveForLockScreen(true, metadata, { showSeekForward: true, showSeekBackward: true });
      lockScreenActive = true;
    } else {
      p.updateLockScreenMetadata(metadata);
    }
  } catch {
    // Lock screen controls are best-effort (not every platform supports them).
  }
}

function handleTrackEnd() {
  const { repeat, queue, index } = usePlayer.getState();
  const p = getPlayer();
  if (repeat === 'one') {
    p.seekTo(0).then(() => p.play());
    return;
  }
  if (index < queue.length - 1) {
    usePlayer.setState({ index: index + 1 });
    load(queue[index + 1], true);
  } else if (repeat === 'all' && queue.length) {
    usePlayer.setState({ index: 0 });
    load(queue[0], true);
  } else {
    // End of the queue: stop on the last track, rewound.
    p.pause();
    p.seekTo(0);
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      originalQueue: [],
      index: 0,
      contextLabel: '',
      shuffle: false,
      repeat: 'off',
      isPlaying: false,
      error: null,

      playTracks: (tracks, startIndex = 0, contextLabel = '', opts) => {
        if (!tracks.length) return;
        const ids = tracks.map((t) => t.id);
        const shuffle = opts?.shuffle ?? get().shuffle;
        let queue = ids;
        let index = startIndex;
        if (shuffle) {
          const first = opts?.shuffle ? ids[Math.floor(Math.random() * ids.length)] : ids[startIndex];
          const rest = [...ids];
          rest.splice(rest.indexOf(first), 1);
          queue = [first, ...shuffled(rest)];
          index = 0;
        }
        set({ queue, originalQueue: ids, index, contextLabel, shuffle });
        load(queue[index], true);
      },

      togglePlay: () => {
        const { queue, index } = get();
        const current = queue[index];
        if (!current) return;
        const p = getPlayer();
        if (loadedTrackId !== current) {
          // e.g. after an app restart: the queue was restored but nothing is loaded yet.
          load(current, true);
          return;
        }
        if (p.playing) p.pause();
        else p.play();
      },

      next: () => {
        const { queue, index, repeat } = get();
        if (!queue.length) return;
        if (index < queue.length - 1) {
          set({ index: index + 1 });
          load(queue[index + 1], true);
        } else {
          set({ index: 0 });
          load(queue[0], repeat === 'all');
        }
      },

      previous: () => {
        const { queue, index, repeat } = get();
        if (!queue.length) return;
        const p = getPlayer();
        if (loadedTrackId === queue[index] && p.currentTime > 3) {
          p.seekTo(0);
          return;
        }
        if (index > 0) {
          set({ index: index - 1 });
          load(queue[index - 1], true);
        } else if (repeat === 'all') {
          set({ index: queue.length - 1 });
          load(queue[queue.length - 1], true);
        } else {
          p.seekTo(0);
        }
      },

      seekTo: (seconds) => {
        getPlayer().seekTo(Math.max(0, seconds));
      },

      jumpTo: (queueIndex) => {
        const { queue } = get();
        if (queueIndex < 0 || queueIndex >= queue.length) return;
        set({ index: queueIndex });
        load(queue[queueIndex], true);
      },

      toggleShuffle: () => {
        const { shuffle, queue, originalQueue, index } = get();
        const current = queue[index];
        if (!shuffle) {
          const rest = queue.filter((_, i) => i !== index);
          set({ shuffle: true, queue: current ? [current, ...shuffled(rest)] : shuffled(rest), index: 0 });
        } else {
          const restored = originalQueue.length ? originalQueue : queue;
          set({ shuffle: false, queue: restored, index: Math.max(0, restored.indexOf(current)) });
        }
      },

      cycleRepeat: () => {
        const order: RepeatMode[] = ['off', 'all', 'one'];
        set((s) => ({ repeat: order[(order.indexOf(s.repeat) + 1) % order.length] }));
      },

      playNext: (track) => {
        const { queue, originalQueue, index } = get();
        if (!queue.length) {
          get().playTracks([track], 0, 'Queue');
          return;
        }
        const q = [...queue];
        q.splice(index + 1, 0, track.id);
        const o = [...originalQueue];
        o.splice(o.indexOf(queue[index]) + 1, 0, track.id);
        set({ queue: q, originalQueue: o });
      },

      addToQueue: (track) => {
        const { queue, originalQueue } = get();
        if (!queue.length) {
          get().playTracks([track], 0, 'Queue');
          return;
        }
        set({ queue: [...queue, track.id], originalQueue: [...originalQueue, track.id] });
      },

      removeFromQueue: (queueIndex) => {
        const { queue, originalQueue, index } = get();
        if (queueIndex === index) return; // never remove the playing track
        const removed = queue[queueIndex];
        const q = queue.filter((_, i) => i !== queueIndex);
        const oi = originalQueue.indexOf(removed);
        const o = oi >= 0 ? originalQueue.filter((_, i) => i !== oi) : originalQueue;
        set({ queue: q, originalQueue: o, index: queueIndex < index ? index - 1 : index });
      },
    }),
    {
      name: 'paadal-player',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Restore the last queue on launch, but never auto-play.
      partialize: (s) => ({
        queue: s.queue,
        originalQueue: s.originalQueue,
        index: s.index,
        contextLabel: s.contextLabel,
        shuffle: s.shuffle,
        repeat: s.repeat,
      }),
    },
  ),
);

export const useCurrentTrack = () => usePlayer((s) => (s.queue[s.index] ? getTrack(s.queue[s.index]) : undefined));
