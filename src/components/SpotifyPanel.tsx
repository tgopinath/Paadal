import { FontAwesome } from '@expo/vector-icons';
import { exchangeCodeAsync, ResponseType, useAuthRequest } from 'expo-auth-session';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Notice } from '@/components/Notice';
import { QuickPicks, SearchField } from '@/components/SearchField';
import { SectionTitle } from '@/components/Shelf';
import { FILM_SONG_QUICK_PICKS, SPOTIFY_CLIENT_ID } from '@/config';
import {
  artistNames,
  getPlayback,
  imageUrl,
  myPlaylists,
  nextSpotify,
  pauseSpotify,
  playOnSpotify,
  previousSpotify,
  resumeSpotify,
  searchSpotify,
  SPOTIFY_SCOPES,
  spotifyDiscovery,
  SpotifyError,
  spotifyRedirectUri,
  useSpotifyAuth,
  type SpotifyPlayback,
  type SpotifyPlaylist,
  type SpotifyTrack,
} from '@/services/spotify';
import { colors, radius, spacing } from '@/theme';

export const SPOTIFY_GREEN = '#1DB954';

const message = (e: unknown) => (e instanceof SpotifyError ? e.message : 'Couldn’t reach Spotify. Check your connection.');

function openSpotifyApp() {
  if (Platform.OS === 'web') {
    window.open('https://open.spotify.com', '_blank', 'noopener');
    return;
  }
  Linking.openURL('spotify:').catch(() => Linking.openURL('https://open.spotify.com'));
}

function ConnectSpotify({ onError }: { onError: (m: string | null) => void }) {
  const setTokens = useSpotifyAuth((s) => s.setTokens);
  const redirectUri = spotifyRedirectUri();
  const [request, response, promptAsync] = useAuthRequest(
    { clientId: SPOTIFY_CLIENT_ID, scopes: SPOTIFY_SCOPES, redirectUri, usePKCE: true, responseType: ResponseType.Code },
    spotifyDiscovery,
  );
  // The response we've finished exchanging; while a newer success is pending we show a spinner.
  const [handled, setHandled] = useState<typeof response>(null);
  const busy = response?.type === 'success' && handled !== response;

  useEffect(() => {
    if (response?.type === 'success' && request?.codeVerifier) {
      exchangeCodeAsync(
        { clientId: SPOTIFY_CLIENT_ID, code: response.params.code, redirectUri, extraParams: { code_verifier: request.codeVerifier } },
        spotifyDiscovery,
      )
        .then((t) => {
          setTokens({ accessToken: t.accessToken, refreshToken: t.refreshToken, expiresIn: t.expiresIn });
          onError(null);
        })
        .catch(() => onError('Spotify sign-in didn’t finish. Please try again.'))
        .finally(() => setHandled(response));
    } else if (response?.type === 'error') {
      onError(response.params.error === 'access_denied' ? 'Spotify access was cancelled.' : 'Spotify sign-in failed. Please try again.');
    }
  }, [response, request, redirectUri, setTokens, onError]);

  return (
    <View style={styles.connect}>
      <FontAwesome name="spotify" size={48} color={SPOTIFY_GREEN} />
      <Text style={styles.connectTitle}>Listen with Spotify</Text>
      <Text style={styles.connectText}>
        Pick film songs here and they play in your Spotify app, so music keeps going with your screen locked. You need the Spotify
        app and Spotify Premium.
      </Text>
      <Pressable
        onPress={() => promptAsync()}
        disabled={!request || busy}
        accessibilityRole="button"
        style={({ pressed }) => [styles.connectButton, (!request || busy) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
      >
        {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.connectButtonText}>Connect Spotify</Text>}
      </Pressable>
    </View>
  );
}

function NowPlaying({ playback, onChanged, onError }: { playback: SpotifyPlayback | null; onChanged: () => void; onError: (m: string) => void }) {
  const item = playback?.item;
  const run = (fn: () => Promise<unknown>) => () =>
    fn()
      .then(() => setTimeout(onChanged, 400))
      .catch((e) => onError(message(e)));

  if (!item) {
    return (
      <Notice title="Nothing playing on Spotify">
        Tap any song below. If nothing happens, open the Spotify app on this device first.
      </Notice>
    );
  }
  return (
    <View style={styles.nowPlaying}>
      <Image source={{ uri: imageUrl(item.album.images) }} style={styles.npArt} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={styles.npTitle}>{item.name}</Text>
        <Text numberOfLines={1} style={styles.npArtist}>{artistNames(item)}</Text>
        <Text numberOfLines={1} style={styles.npDevice}>
          <FontAwesome name="spotify" size={11} color={SPOTIFY_GREEN} /> Playing on {playback.device.name}
        </Text>
      </View>
      <IconButton name="play-skip-back" label="Previous on Spotify" onPress={run(previousSpotify)} />
      <IconButton
        name={playback.is_playing ? 'pause' : 'play'}
        size={30}
        label={playback.is_playing ? 'Pause Spotify' : 'Play Spotify'}
        onPress={run(playback.is_playing ? pauseSpotify : resumeSpotify)}
      />
      <IconButton name="play-skip-forward" label="Next on Spotify" onPress={run(nextSpotify)} />
    </View>
  );
}

function TrackRow({ track, onPress }: { track: SpotifyTrack; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Play ${track.name} on Spotify`} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
      <Image source={{ uri: imageUrl(track.album.images) }} style={styles.art} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={styles.title}>{track.name}</Text>
        <Text numberOfLines={1} style={styles.subtitle}>{artistNames(track)} • {track.album.name}</Text>
      </View>
    </Pressable>
  );
}

function PlaylistCard({ playlist, onPress }: { playlist: SpotifyPlaylist; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Play playlist ${playlist.name} on Spotify`} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
      {imageUrl(playlist.images) ? (
        <Image source={{ uri: imageUrl(playlist.images) }} style={styles.cardArt} />
      ) : (
        <View style={[styles.cardArt, styles.cardArtEmpty]}>
          <FontAwesome name="music" size={32} color={colors.textFaint} />
        </View>
      )}
      <Text numberOfLines={2} style={styles.cardTitle}>{playlist.name}</Text>
      {playlist.owner.display_name ? <Text numberOfLines={1} style={styles.subtitle}>{playlist.owner.display_name}</Text> : null}
    </Pressable>
  );
}

export function SpotifyPanel() {
  const connected = useSpotifyAuth((s) => !!s.refreshToken || !!s.accessToken);
  const signOut = useSpotifyAuth((s) => s.signOut);

  const [error, setError] = useState<string | null>(null);
  const [playback, setPlayback] = useState<SpotifyPlayback | null>(null);
  const [mine, setMine] = useState<SpotifyPlaylist[]>([]);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [results, setResults] = useState<{ tracks: SpotifyTrack[]; playlists: SpotifyPlaylist[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshPlayback = useCallback(() => {
    getPlayback().then(setPlayback).catch(() => {});
  }, []);

  // Poll what's playing while this panel is open and the app is in the foreground.
  useEffect(() => {
    if (!connected) return;
    refreshPlayback();
    myPlaylists().then(setMine).catch((e) => setError(message(e)));
    let timer: ReturnType<typeof setInterval> | null = setInterval(refreshPlayback, 5000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        refreshPlayback();
        timer ??= setInterval(refreshPlayback, 5000);
      } else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    return () => {
      if (timer) clearInterval(timer);
      sub.remove();
    };
  }, [connected, refreshPlayback]);

  const play = (body: Parameters<typeof playOnSpotify>[0]) => {
    setError(null);
    playOnSpotify(body)
      .then(() => setTimeout(refreshPlayback, 600))
      .catch((e) => setError(message(e)));
  };

  const runSearch = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setQuery(text);
    setActiveQuery(text);
    setLoading(true);
    setError(null);
    try {
      setResults(await searchSpotify(text));
    } catch (e) {
      setResults(null);
      setError(message(e));
    } finally {
      setLoading(false);
    }
  };

  if (!SPOTIFY_CLIENT_ID) {
    return (
      <Notice title="Spotify isn’t set up yet">
        The app owner needs to add a Spotify Client ID (see the README → “Film songs: Spotify and YouTube”).
      </Notice>
    );
  }

  if (!connected) {
    return (
      <View>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <ConnectSpotify onError={setError} />
      </View>
    );
  }

  return (
    <View>
      <NowPlaying playback={playback} onChanged={refreshPlayback} onError={setError} />
      {error ? (
        <View>
          <Notice tone="error">{error}</Notice>
          <Pressable onPress={openSpotifyApp} accessibilityRole="button" style={styles.openApp}>
            <FontAwesome name="spotify" size={16} color={SPOTIFY_GREEN} />
            <Text style={styles.openAppText}>Open Spotify</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.md }}>
        <SearchField value={query} onChangeText={setQuery} onSubmit={runSearch} placeholder="Search film songs on Spotify" label="Search Spotify" />
        <QuickPicks picks={FILM_SONG_QUICK_PICKS} onPick={runSearch} active={activeQuery} />
      </View>

      {loading ? <ActivityIndicator color={colors.text} style={{ marginVertical: spacing.xl }} /> : null}

      {!loading && results && (
        <>
          {results.playlists.length > 0 && (
            <View style={styles.section}>
              <SectionTitle>Playlists</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
                {results.playlists.map((p) => (
                  <PlaylistCard key={p.id} playlist={p} onPress={() => play({ context_uri: p.uri })} />
                ))}
              </ScrollView>
            </View>
          )}
          <View style={styles.section}>
            <SectionTitle>Songs</SectionTitle>
            {results.tracks.length === 0 ? <Text style={styles.empty}>No songs found for “{activeQuery}”.</Text> : null}
            {results.tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} onPress={() => play({ uris: results.tracks.map((x) => x.uri), offset: { position: i } })} />
            ))}
          </View>
        </>
      )}

      {mine.length > 0 && (
        <View style={styles.section}>
          <SectionTitle>Your Spotify playlists</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
            {mine.map((p) => (
              <PlaylistCard key={p.id} playlist={p} onPress={() => play({ context_uri: p.uri })} />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.brand}>
        <FontAwesome name="spotify" size={16} color={SPOTIFY_GREEN} />
        <Text style={styles.brandText}>Music from Spotify</Text>
        <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.disconnect}>Disconnect</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  connect: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, gap: spacing.md },
  connectTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  connectText: { color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 420 },
  connectButton: { marginTop: spacing.sm, backgroundColor: SPOTIFY_GREEN, borderRadius: radius.pill, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, minWidth: 200, alignItems: 'center' },
  connectButtonText: { color: '#000', fontWeight: '800', fontSize: 15 },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  npArt: { width: 52, height: 52, borderRadius: radius.sm, marginRight: spacing.sm, backgroundColor: colors.surface },
  npTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  npArtist: { color: colors.textMuted, fontSize: 13, marginTop: 1 },
  npDevice: { color: SPOTIFY_GREEN, fontSize: 11, marginTop: 3, fontWeight: '600' },
  openApp: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', marginHorizontal: spacing.lg, paddingVertical: spacing.xs },
  openAppText: { color: colors.text, fontWeight: '700' },
  section: { marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  art: { width: 48, height: 48, borderRadius: 4, backgroundColor: colors.surfaceRaised },
  title: { color: colors.text, fontSize: 15, fontWeight: '500' },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cards: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  card: { width: 136 },
  cardArt: { width: 136, height: 136, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  cardArtEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: spacing.sm },
  empty: { color: colors.textMuted, paddingHorizontal: spacing.lg },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.xl },
  brandText: { color: colors.textFaint, fontSize: 12 },
  disconnect: { color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline', marginLeft: spacing.md },
});
