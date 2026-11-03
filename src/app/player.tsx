import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/Artwork';
import { IconButton } from '@/components/IconButton';
import { PlayButton } from '@/components/PlayButton';
import { SeekBar } from '@/components/SeekBar';
import { artistName, getAlbum, trackColors } from '@/data/catalog';
import { describeContext } from '@/lib/context';
import { useIsLiked, useLibrary } from '@/store/library';
import { useCurrentTrack, usePlaybackStatus, usePlayer } from '@/store/player';
import { colors, spacing } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function Progress() {
  const status = usePlaybackStatus();
  const seekTo = usePlayer((s) => s.seekTo);
  return <SeekBar position={status.currentTime} duration={status.duration} onSeek={seekTo} />;
}

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const track = useCurrentTrack();
  const { isPlaying, error, shuffle, repeat, contextLabel, togglePlay, next, previous, toggleShuffle, cycleRepeat } = usePlayer();
  const liked = useIsLiked(track?.id);
  const toggleLike = useLibrary((s) => s.toggleLike);

  if (!track) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.emptyText}>Nothing is playing.</Text>
        <Pressable onPress={close} accessibilityRole="button" style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.accent, fontWeight: '700' }}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const gradient = trackColors(track);
  const contentWidth = Math.min(width, 520) - spacing.xl * 2;
  const artSize = Math.min(contentWidth, height * 0.42);

  return (
    <LinearGradient colors={[gradient[0], '#121218', colors.bg]} locations={[0, 0.65, 1]} style={styles.screen}>
      <View style={[styles.inner, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg, width: contentWidth + spacing.xl * 2 }]}>
        <View style={styles.topBar}>
          <IconButton name="chevron-down" size={28} label="Close player" onPress={close} />
          <View style={styles.topText}>
            <Text style={styles.playingFrom}>PLAYING FROM</Text>
            <Text numberOfLines={1} style={styles.context}>{describeContext(contextLabel)}</Text>
          </View>
          <IconButton
            name="ellipsis-horizontal"
            label="Song options"
            onPress={() => router.push({ pathname: '/track/[id]', params: { id: track.id, playlistId: '' } })}
          />
        </View>

        <View style={styles.artWrap}>
          <Artwork colors={gradient} size={artSize} label={getAlbum(track.albumId)?.title} style={styles.art} />
        </View>

        <View style={styles.meta}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
            <Pressable onPress={() => router.push({ pathname: '/artist/[id]', params: { id: track.artistId } })} accessibilityRole="link">
              <Text numberOfLines={1} style={styles.artist}>{artistName(track)}</Text>
            </Pressable>
          </View>
          <IconButton
            name={liked ? 'heart' : 'heart-outline'}
            size={28}
            color={liked ? colors.accent : colors.text}
            label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            onPress={() => toggleLike(track.id)}
          />
        </View>

        {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
        <Progress />

        <View style={styles.controls}>
          <IconButton name="shuffle" size={26} color={shuffle ? colors.accent : colors.text} label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'} onPress={toggleShuffle} />
          <IconButton name="play-skip-back" size={34} label="Previous track" onPress={previous} />
          <PlayButton playing={isPlaying} onPress={togglePlay} size={72} color={colors.text} />
          <IconButton name="play-skip-forward" size={34} label="Next track" onPress={next} />
          <View>
            <IconButton
              name="repeat"
              size={26}
              color={repeat === 'off' ? colors.text : colors.accent}
              label={repeat === 'off' ? 'Repeat all' : repeat === 'all' ? 'Repeat one' : 'Turn repeat off'}
              onPress={cycleRepeat}
            />
            {repeat === 'one' && <Text style={styles.repeatOne}>1</Text>}
          </View>
        </View>

        <View style={styles.bottomRow}>
          <IconButton name="list" size={22} color={colors.textMuted} label="Open queue" onPress={() => router.push('/queue')} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  center: { justifyContent: 'center', backgroundColor: colors.bg },
  emptyText: { color: colors.textMuted, fontSize: 16 },
  inner: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  topText: { flex: 1, alignItems: 'center' },
  playingFrom: { color: colors.textMuted, fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  context: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 2 },
  artWrap: { alignItems: 'center', marginVertical: spacing.lg },
  art: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 16 },
  meta: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  artist: { color: colors.textMuted, fontSize: 16, marginTop: 4 },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.sm },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  repeatOne: { position: 'absolute', right: 2, top: 0, color: colors.accent, fontSize: 10, fontWeight: '900' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.lg },
});
