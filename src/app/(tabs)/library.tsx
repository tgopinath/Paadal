import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/Artwork';
import { IconButton } from '@/components/IconButton';
import { getAlbum, getArtist, getPlaylist, type Gradient } from '@/data/catalog';
import { songCount } from '@/lib/format';
import { useLibrary } from '@/store/library';
import { colors, MINI_PLAYER_HEIGHT, radius, spacing } from '@/theme';

type Filter = 'all' | 'playlists' | 'albums' | 'artists';
type Item = {
  key: string;
  type: Exclude<Filter, 'all'>;
  title: string;
  subtitle: string;
  colors: Gradient;
  href: Href;
  icon?: 'heart';
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
];

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const { likedIds, userPlaylists, savedPlaylistIds, savedAlbumIds, followedArtistIds } = useLibrary();

  const items: Item[] = [
    { key: 'liked', type: 'playlists', title: 'Liked Songs', subtitle: `Playlist • ${songCount(likedIds.length)}`, colors: ['#5B2A86', '#FF7A45'], href: '/liked', icon: 'heart' },
    ...userPlaylists.map((p): Item => ({
      key: p.id, type: 'playlists', title: p.title, subtitle: `Playlist • You • ${songCount(p.trackIds.length)}`, colors: p.colors,
      href: { pathname: '/playlist/[id]', params: { id: p.id } },
    })),
    ...savedPlaylistIds.flatMap((id): Item[] => {
      const p = getPlaylist(id);
      return p ? [{ key: p.id, type: 'playlists', title: p.title, subtitle: 'Playlist • Paadal', colors: p.colors, href: { pathname: '/playlist/[id]', params: { id } } }] : [];
    }),
    ...savedAlbumIds.flatMap((id): Item[] => {
      const a = getAlbum(id);
      return a ? [{ key: a.id, type: 'albums', title: a.title, subtitle: `Album • ${getArtist(a.artistId)?.name ?? ''}`, colors: a.colors, href: { pathname: '/album/[id]', params: { id } } }] : [];
    }),
    ...followedArtistIds.flatMap((id): Item[] => {
      const a = getArtist(id);
      return a ? [{ key: a.id, type: 'artists', title: a.name, subtitle: 'Artist', colors: a.colors, href: { pathname: '/artist/[id]', params: { id } } }] : [];
    }),
  ];
  const visible = filter === 'all' ? items : items.filter((i) => i.type === filter);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Text style={styles.heading} accessibilityRole="header">Your Library</Text>
        <IconButton name="add" size={28} label="Create playlist" onPress={() => router.push('/create-playlist')} />
      </View>
      <View style={styles.chips}>
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={visible}
        keyExtractor={(i) => i.key}
        contentContainerStyle={{ paddingBottom: MINI_PLAYER_HEIGHT + spacing.xxl }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(item.href)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${item.subtitle}`}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
          >
            <Artwork colors={item.colors} size={60} round={item.type === 'artists'} icon={item.icon ?? (item.type === 'artists' ? 'person' : undefined)} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
              <Text numberOfLines={1} style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyText}>
              {filter === 'artists' ? 'Follow artists to see them here.' : 'Tap the heart on albums and playlists to save them here.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexWrap: 'wrap' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#111' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  empty: { padding: spacing.xxl, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: spacing.sm, textAlign: 'center' },
});
