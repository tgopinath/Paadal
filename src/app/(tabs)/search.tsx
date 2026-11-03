import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaCard } from '@/components/MediaCard';
import { SectionTitle } from '@/components/Shelf';
import { TrackRow } from '@/components/TrackRow';
import { getArtist, playlists, search } from '@/data/catalog';
import { usePlayer } from '@/store/player';
import { colors, MINI_PLAYER_HEIGHT, radius, spacing } from '@/theme';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const results = useMemo(() => search(query), [query]);
  const playTracks = usePlayer((s) => s.playTracks);
  const genres = playlists.filter((p) => p.genre);
  const hasQuery = query.trim().length > 0;
  const noResults = hasQuery && !results.tracks.length && !results.artists.length && !results.albums.length && !results.playlists.length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.heading} accessibilityRole="header">Search</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={20} color="#333" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="What do you want to listen to?"
          placeholderTextColor="#666"
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search songs, artists, albums and playlists"
        />
        {hasQuery && (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
            <Ionicons name="close-circle" size={20} color="#555" />
          </Pressable>
        )}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: MINI_PLAYER_HEIGHT + spacing.xxl }}>
        {!hasQuery && (
          <>
            <SectionTitle>Browse all</SectionTitle>
            <View style={styles.genreGrid}>
              {genres.map((g) => (
                <Pressable
                  key={g.id}
                  style={({ pressed }) => [styles.genreCell, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: g.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={g.title}
                >
                  <LinearGradient colors={[g.colors[0], g.colors[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.genre}>
                    <Text style={styles.genreText}>{g.title}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {noResults && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No results for “{query.trim()}”</Text>
            <Text style={styles.emptyText}>Check the spelling, or try a different keyword.</Text>
          </View>
        )}

        {results.tracks.length > 0 && (
          <View style={styles.section}>
            <SectionTitle>Songs</SectionTitle>
            {results.tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} onPress={() => playTracks(results.tracks, i, `Search: ${query.trim()}`)} />
            ))}
          </View>
        )}

        {results.artists.length > 0 && (
          <ResultShelf title="Artists">
            {results.artists.map((a) => (
              <MediaCard key={a.id} round size={120} title={a.name} subtitle="Artist" colors={a.colors} onPress={() => router.push({ pathname: '/artist/[id]', params: { id: a.id } })} />
            ))}
          </ResultShelf>
        )}

        {results.albums.length > 0 && (
          <ResultShelf title="Albums">
            {results.albums.map((a) => (
              <MediaCard key={a.id} size={120} title={a.title} subtitle={getArtist(a.artistId)?.name} colors={a.colors} onPress={() => router.push({ pathname: '/album/[id]', params: { id: a.id } })} />
            ))}
          </ResultShelf>
        )}

        {results.playlists.length > 0 && (
          <ResultShelf title="Playlists">
            {results.playlists.map((p) => (
              <MediaCard key={p.id} size={120} title={p.title} subtitle={p.description} colors={p.colors} onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: p.id } })} />
            ))}
          </ResultShelf>
        )}
      </ScrollView>
    </View>
  );
}

function ResultShelf({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionTitle>{title}</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, paddingHorizontal: spacing.lg },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F5F5F7',
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  input: { flex: 1, color: '#111', fontSize: 16, height: '100%', ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null) },
  section: { marginTop: spacing.lg },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg - spacing.xs },
  genreCell: { width: '50%', padding: spacing.xs },
  genre: { height: 96, borderRadius: radius.md, padding: spacing.md },
  genreText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  empty: { padding: spacing.xxl, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: spacing.sm, textAlign: 'center' },
});
