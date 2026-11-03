import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/Artwork';
import { MediaCard } from '@/components/MediaCard';
import { Shelf } from '@/components/Shelf';
import { albums, artistName, artists, getArtist, playlists, resolveTracks, trackColors, type Gradient } from '@/data/catalog';
import { greeting } from '@/lib/format';
import { useLibrary } from '@/store/library';
import { usePlayer } from '@/store/player';
import { colors, MINI_PLAYER_HEIGHT, radius, spacing } from '@/theme';

const LIKED_COLORS: Gradient = ['#5B2A86', '#FF7A45'];

function QuickTile({ title, gradient, onPress, icon }: { title: string; gradient: Gradient; onPress: () => void; icon?: 'heart' }) {
  const { width } = useWindowDimensions();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [styles.tile, width >= 900 && { width: '33.333%' }, pressed && { opacity: 0.7 }]}>
      <View style={styles.tileInner}>
        <Artwork colors={gradient} size={56} icon={icon} style={{ borderRadius: 0 }} />
        <Text numberOfLines={2} style={styles.tileText}>{title}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const recentIds = useLibrary((s) => s.recentTrackIds);
  const userPlaylists = useLibrary((s) => s.userPlaylists);
  const playTracks = usePlayer((s) => s.playTracks);
  const recent = resolveTracks(recentIds).slice(0, 10);
  const mixes = playlists.filter((p) => !p.genre);

  const quick = [
    { key: 'liked', title: 'Liked Songs', gradient: LIKED_COLORS, icon: 'heart' as const, onPress: () => router.push('/liked') },
    ...userPlaylists.slice(0, 2).map((p) => ({ key: p.id, title: p.title, gradient: p.colors, icon: undefined, onPress: () => router.push({ pathname: '/playlist/[id]', params: { id: p.id } }) })),
    ...mixes.map((p) => ({ key: p.id, title: p.title, gradient: p.colors, icon: undefined, onPress: () => router.push({ pathname: '/playlist/[id]', params: { id: p.id } }) })),
  ].slice(0, 6);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: MINI_PLAYER_HEIGHT + spacing.xxl }}>
      <Text style={styles.greeting} accessibilityRole="header">{greeting()}</Text>

      <View style={styles.grid}>
        {quick.map(({ key, ...q }) => (
          <QuickTile key={key} {...q} />
        ))}
      </View>

      {recent.length > 0 && (
        <Shelf title="Recently played">
          {recent.map((t, i) => (
            <MediaCard key={t.id} title={t.title} subtitle={artistName(t)} colors={trackColors(t)} size={128} onPress={() => playTracks(recent, i, 'Recently played')} />
          ))}
        </Shelf>
      )}

      <Shelf title="Made for you">
        {mixes.map((p) => (
          <MediaCard key={p.id} title={p.title} subtitle={p.description} colors={p.colors} onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: p.id } })} />
        ))}
      </Shelf>

      <Shelf title="New albums">
        {[...albums].sort((a, b) => b.year - a.year).map((a) => (
          <MediaCard key={a.id} title={a.title} subtitle={getArtist(a.artistId)?.name} colors={a.colors} onPress={() => router.push({ pathname: '/album/[id]', params: { id: a.id } })} />
        ))}
      </Shelf>

      <Shelf title="Popular artists">
        {artists.map((a) => (
          <MediaCard key={a.id} round title={a.name} subtitle="Artist" colors={a.colors} size={128} onPress={() => router.push({ pathname: '/artist/[id]', params: { id: a.id } })} />
        ))}
      </Shelf>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  greeting: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, paddingHorizontal: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg - spacing.xs, marginTop: spacing.lg },
  tile: { width: '50%', padding: spacing.xs },
  tileInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radius.sm, overflow: 'hidden' },
  tileText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '700', paddingHorizontal: spacing.sm },
});
