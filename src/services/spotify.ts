import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshAsync } from 'expo-auth-session';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SPOTIFY_CLIENT_ID } from '@/config';
import { pauseLocalPlayback } from '@/store/player';

/**
 * Spotify integration through the Web API ("Spotify Connect").
 *
 * Paadal never streams Spotify audio itself: it tells the listener's own
 * Spotify app (phone, desktop or web player) what to play. That app keeps
 * playing with the screen locked. Choosing songs needs Spotify Premium.
 */

export const spotifyDiscovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
];

/** Must exactly match a Redirect URI registered in the Spotify developer dashboard. */
export function spotifyRedirectUri() {
  if (Platform.OS === 'web') {
    return `${window.location.origin}${process.env.EXPO_BASE_URL ?? ''}/spotify-auth`;
  }
  return 'paadal://spotify-auth';
}

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  /** Epoch ms. */
  expiresAt: number;
  setTokens: (t: { accessToken: string; refreshToken?: string | null; expiresIn?: number }) => void;
  signOut: () => void;
};

export const useSpotifyAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: 0,
      setTokens: ({ accessToken, refreshToken, expiresIn }) =>
        set({
          accessToken,
          refreshToken: refreshToken ?? get().refreshToken,
          expiresAt: Date.now() + (expiresIn ?? 3600) * 1000,
        }),
      signOut: () => set({ accessToken: null, refreshToken: null, expiresAt: 0 }),
    }),
    { name: 'paadal-spotify', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export class SpotifyError extends Error {
  constructor(
    message: string,
    public status: number,
    public reason?: string,
  ) {
    super(message);
  }
}

let refreshing: Promise<string> | null = null;

async function validToken(): Promise<string> {
  const { accessToken, refreshToken, expiresAt, setTokens, signOut } = useSpotifyAuth.getState();
  if (accessToken && Date.now() < expiresAt - 60_000) return accessToken;
  if (!refreshToken) throw new SpotifyError('Please connect Spotify again.', 401);
  refreshing ??= refreshAsync({ clientId: SPOTIFY_CLIENT_ID, refreshToken }, spotifyDiscovery)
    .then((t) => {
      setTokens({ accessToken: t.accessToken, refreshToken: t.refreshToken, expiresIn: t.expiresIn });
      return t.accessToken;
    })
    .catch(() => {
      signOut();
      throw new SpotifyError('Your Spotify session expired. Please connect again.', 401);
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T | null> {
  const token = await validToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : null) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204 || res.status === 202) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = data?.error ?? {};
    if (res.status === 401) useSpotifyAuth.getState().signOut();
    throw new SpotifyError(friendlyMessage(res.status, err.reason, err.message), res.status, err.reason);
  }
  return data as T;
}

function friendlyMessage(status: number, reason?: string, message?: string) {
  if (reason === 'PREMIUM_REQUIRED' || (status === 403 && /premium/i.test(message ?? ''))) {
    return 'Choosing songs needs Spotify Premium.';
  }
  if (reason === 'NO_ACTIVE_DEVICE' || status === 404) {
    return 'Open the Spotify app on this device, play any song for a second, then come back and try again.';
  }
  if (status === 403) return 'Spotify didn’t allow this. Your account may not be added to this app yet.';
  if (status === 429) return 'Too many requests to Spotify. Wait a moment and try again.';
  return message || 'Something went wrong talking to Spotify.';
}

// ---------------------------------------------------------------------------
// Types (only the fields Paadal uses)
// ---------------------------------------------------------------------------

type Image = { url: string; width?: number | null };
export type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: Image[] };
};
export type SpotifyPlaylist = {
  id: string;
  uri: string;
  name: string;
  images: Image[] | null;
  owner: { display_name?: string };
};
export type SpotifyPlayback = {
  is_playing: boolean;
  progress_ms: number | null;
  device: { id: string | null; name: string; type: string };
  item: (SpotifyTrack & { duration_ms: number }) | null;
};

export const imageUrl = (images: Image[] | null | undefined) => images?.[0]?.url;
export const artistNames = (t: SpotifyTrack) => t.artists.map((a) => a.name).join(', ');

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function searchSpotify(query: string) {
  const params = new URLSearchParams({ q: query, type: 'track,playlist', limit: '10', market: 'from_token' });
  const data = await api<{ tracks?: { items: (SpotifyTrack | null)[] }; playlists?: { items: (SpotifyPlaylist | null)[] } }>(
    'GET',
    `/search?${params}`,
  );
  return {
    tracks: (data?.tracks?.items ?? []).filter((t): t is SpotifyTrack => !!t),
    playlists: (data?.playlists?.items ?? []).filter((p): p is SpotifyPlaylist => !!p),
  };
}

export async function myPlaylists() {
  const data = await api<{ items: (SpotifyPlaylist | null)[] }>('GET', '/me/playlists?limit=30');
  return (data?.items ?? []).filter((p): p is SpotifyPlaylist => !!p);
}

export const getPlayback = () => api<SpotifyPlayback>('GET', '/me/player?market=from_token');

type PlayBody = { uris: string[]; offset?: { position: number } } | { context_uri: string };

/** Starts playback on the listener's Spotify app, picking a device if none is active. */
export async function playOnSpotify(body: PlayBody) {
  pauseLocalPlayback();
  try {
    await api('PUT', '/me/player/play', body);
  } catch (e) {
    if (!(e instanceof SpotifyError) || e.status !== 404) throw e;
    const devices = await api<{ devices: { id: string | null; is_restricted: boolean }[] }>('GET', '/me/player/devices');
    const device = devices?.devices.find((d) => d.id && !d.is_restricted);
    if (!device?.id) throw e;
    await api('PUT', `/me/player/play?device_id=${encodeURIComponent(device.id)}`, body);
  }
}

export const pauseSpotify = () => api('PUT', '/me/player/pause');
export const resumeSpotify = () => {
  pauseLocalPlayback();
  return api('PUT', '/me/player/play');
};
export const nextSpotify = () => api('POST', '/me/player/next');
export const previousSpotify = () => api('POST', '/me/player/previous');
