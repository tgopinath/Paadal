import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Gradient } from '@/data/catalog';

export type UserPlaylist = {
  id: string;
  title: string;
  trackIds: string[];
  colors: Gradient;
  createdAt: number;
};

type LibraryState = {
  likedIds: string[];
  userPlaylists: UserPlaylist[];
  /** Saved catalog playlists / albums / followed artists. */
  savedPlaylistIds: string[];
  savedAlbumIds: string[];
  followedArtistIds: string[];
  recentTrackIds: string[];

  toggleLike: (trackId: string) => void;
  createPlaylist: (title: string, firstTrackId?: string) => string;
  renamePlaylist: (id: string, title: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  toggleSavedPlaylist: (id: string) => void;
  toggleSavedAlbum: (id: string) => void;
  toggleFollowArtist: (id: string) => void;
  pushRecent: (trackId: string) => void;
};

const PALETTE: Gradient[] = [
  ['#FF7A45', '#5B2A86'],
  ['#2CB1BC', '#0B3D91'],
  ['#F9C74F', '#B5179E'],
  ['#43AA8B', '#16161D'],
  ['#E4405F', '#277DA1'],
];

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      likedIds: [],
      userPlaylists: [],
      savedPlaylistIds: [],
      savedAlbumIds: [],
      followedArtistIds: [],
      recentTrackIds: [],

      toggleLike: (trackId) => set((s) => ({ likedIds: toggle(s.likedIds, trackId) })),

      createPlaylist: (title, firstTrackId) => {
        const id = `up-${Date.now().toString(36)}`;
        const colors = PALETTE[get().userPlaylists.length % PALETTE.length];
        const playlist: UserPlaylist = {
          id,
          title: title.trim() || `My Playlist #${get().userPlaylists.length + 1}`,
          trackIds: firstTrackId ? [firstTrackId] : [],
          colors,
          createdAt: Date.now(),
        };
        set((s) => ({ userPlaylists: [playlist, ...s.userPlaylists] }));
        return id;
      },

      renamePlaylist: (id, title) =>
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) => (p.id === id ? { ...p, title } : p)),
        })),

      deletePlaylist: (id) =>
        set((s) => ({ userPlaylists: s.userPlaylists.filter((p) => p.id !== id) })),

      addToPlaylist: (playlistId, trackId) =>
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) =>
            p.id === playlistId && !p.trackIds.includes(trackId)
              ? { ...p, trackIds: [...p.trackIds, trackId] }
              : p,
          ),
        })),

      removeFromPlaylist: (playlistId, trackId) =>
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) =>
            p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p,
          ),
        })),

      toggleSavedPlaylist: (id) => set((s) => ({ savedPlaylistIds: toggle(s.savedPlaylistIds, id) })),
      toggleSavedAlbum: (id) => set((s) => ({ savedAlbumIds: toggle(s.savedAlbumIds, id) })),
      toggleFollowArtist: (id) => set((s) => ({ followedArtistIds: toggle(s.followedArtistIds, id) })),

      pushRecent: (trackId) =>
        set((s) => ({
          recentTrackIds: [trackId, ...s.recentTrackIds.filter((t) => t !== trackId)].slice(0, 30),
        })),
    }),
    {
      name: 'paadal-library',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const useIsLiked = (trackId: string | undefined) =>
  useLibrary((s) => (trackId ? s.likedIds.includes(trackId) : false));
