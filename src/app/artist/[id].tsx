import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/CollectionView';
import { MediaCard } from '@/components/MediaCard';
import { NotFound } from '@/components/NotFound';
import { PlayButton } from '@/components/PlayButton';
import { SectionTitle, Shelf } from '@/components/Shelf';
import { TrackRow } from '@/components/TrackRow';
import { albumsForArtist, artists, getArtist, tracksForArtist } from '@/data/catalog';
import { useLibrary } from '@/store/library';
import { usePlayer } from '@/store/player';
import { colors, MINI_PLAYER_HEIGHT, radius, spacing } from '@/theme';

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const artist = getArtist(id);
  const following = useLibrary((s) => s.followedArtistIds.includes(id));
  const toggleFollow = useLibrary((s) => s.toggleFollowArtist);
  const playTracks = usePlayer((s) => s.playTracks);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const context = `artist:${id}`;
  const isThisContext = usePlayer((s) => s.contextLabel === context && s.queue.length > 0);

  if (!artist) return <NotFound what="artist" />;
  const songs = tracksForArtist(artist.id);
  const related = artists.filter((a) => a.id !== artist.id);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: MINI_PLAYER_HEIGHT + insets.bottom + spacing.xxl }}>
        <LinearGradient colors={[artist.colors[0], artist.colors[1], colors.bg]} locations={[0, 0.6, 1]} style={[styles.hero, { paddingTop: insets.top + 120 }]}>
          <Text style={styles.name} accessibilityRole="header">{artist.name}</Text>
        </LinearGradient>
        <View style={styles.body}>
          <Text style={styles.bio}>{artist.bio}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => toggleFollow(artist.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: following }}
              style={[styles.follow, following && { borderColor: colors.text }]}
            >
              <Text style={styles.followText}>{following ? 'Following' : 'Follow'}</Text>
            </Pressable>
            <PlayButton playing={isThisContext && isPlaying} onPress={() => (isThisContext ? togglePlay() : playTracks(songs, 0, context))} />
          </View>
        </View>

        <SectionTitle>Popular</SectionTitle>
        {songs.map((t, i) => (
          <TrackRow key={t.id} track={t} number={i + 1} onPress={() => playTracks(songs, i, context)} />
        ))}

        <Shelf title="Discography">
          {albumsForArtist(artist.id).map((a) => (
            <MediaCard key={a.id} title={a.title} subtitle={`${a.year} • Album`} colors={a.colors} onPress={() => router.push({ pathname: '/album/[id]', params: { id: a.id } })} />
          ))}
        </Shelf>

        <Shelf title="Fans also like">
          {related.map((a) => (
            <MediaCard key={a.id} round size={120} title={a.name} subtitle="Artist" colors={a.colors} onPress={() => router.push({ pathname: '/artist/[id]', params: { id: a.id } })} />
          ))}
        </Shelf>
      </ScrollView>
      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  name: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  body: { paddingHorizontal: spacing.lg },
  bio: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.lg },
  follow: { borderWidth: 1, borderColor: colors.textFaint, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 7 },
  followText: { color: colors.text, fontWeight: '700', fontSize: 13 },
});
