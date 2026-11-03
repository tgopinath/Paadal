import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Artwork } from '@/components/Artwork';
import { IconButton } from '@/components/IconButton';
import { artistName, trackColors } from '@/data/catalog';
import { useIsLiked, useLibrary } from '@/store/library';
import { useCurrentTrack, usePlaybackStatus, usePlayer } from '@/store/player';
import { colors, MINI_PLAYER_HEIGHT, radius, spacing } from '@/theme';

function Progress() {
  const status = usePlaybackStatus();
  const ratio = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
    </View>
  );
}

export function MiniPlayer() {
  const track = useCurrentTrack();
  const isPlaying = usePlayer((s) => s.isPlaying);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const error = usePlayer((s) => s.error);
  const liked = useIsLiked(track?.id);
  const toggleLike = useLibrary((s) => s.toggleLike);

  if (!track) return null;
  const [from] = trackColors(track);

  return (
    <Pressable
      onPress={() => router.push('/player')}
      accessibilityRole="button"
      accessibilityLabel={`Now playing: ${track.title}. Open player`}
      style={[styles.container, { backgroundColor: blend(from) }]}
    >
      <View style={styles.row}>
        <Artwork colors={trackColors(track)} size={44} />
        <View style={styles.text}>
          <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
          <Text numberOfLines={1} style={[styles.artist, error && { color: colors.danger }]}>{error ?? artistName(track)}</Text>
        </View>
        <IconButton
          name={liked ? 'heart' : 'heart-outline'}
          color={liked ? colors.accent : colors.text}
          label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          onPress={() => toggleLike(track.id)}
        />
        <IconButton name={isPlaying ? 'pause' : 'play'} size={28} label={isPlaying ? 'Pause' : 'Play'} onPress={togglePlay} />
        <IconButton name="play-skip-forward" label="Next track" onPress={next} />
      </View>
      <Progress />
    </Pressable>
  );
}

/** Darken the album colour so white text stays readable on it. */
function blend(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  const mix = (c: number) => Math.round(c * 0.35 + 0x16 * 0.65);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
}

const styles = StyleSheet.create({
  container: {
    height: MINI_PLAYER_HEIGHT,
    marginHorizontal: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, gap: spacing.xs },
  text: { flex: 1, minWidth: 0, marginLeft: spacing.sm },
  title: { color: colors.text, fontSize: 14, fontWeight: '600' },
  artist: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  progressTrack: { position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  progressFill: { height: 2, backgroundColor: colors.text },
});
