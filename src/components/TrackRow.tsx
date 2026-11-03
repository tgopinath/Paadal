import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Artwork } from '@/components/Artwork';
import { artistName, trackColors, type Track } from '@/data/catalog';
import { useIsLiked } from '@/store/library';
import { useCurrentTrack, usePlayer } from '@/store/player';
import { colors, spacing } from '@/theme';

type Props = {
  track: Track;
  onPress: () => void;
  /** Show a number instead of artwork (album track lists). */
  number?: number;
  /** When set, the options sheet offers "Remove from this playlist". */
  playlistId?: string;
};

export function TrackRow({ track, onPress, number, playlistId }: Props) {
  const current = useCurrentTrack();
  const isPlaying = usePlayer((s) => s.isPlaying);
  const liked = useIsLiked(track.id);
  const active = current?.id === track.id;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${track.title} by ${artistName(track)}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      {number !== undefined ? (
        <View style={styles.number}>
          {active && isPlaying ? (
            <Ionicons name="stats-chart" size={14} color={colors.accent} />
          ) : (
            <Text style={[styles.numberText, active && { color: colors.accent }]}>{number}</Text>
          )}
        </View>
      ) : (
        <Artwork colors={trackColors(track)} size={48} />
      )}
      <View style={styles.text}>
        <Text numberOfLines={1} style={[styles.title, active && { color: colors.accent }]}>
          {track.title}
        </Text>
        <View style={styles.subRow}>
          {liked && <Ionicons name="heart" size={12} color={colors.accent} style={{ marginRight: 4 }} />}
          <Text numberOfLines={1} style={styles.subtitle}>
            {artistName(track)}
          </Text>
        </View>
      </View>
      <Pressable
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`More options for ${track.title}`}
        onPress={() => router.push({ pathname: '/track/[id]', params: { id: track.id, playlistId: playlistId ?? '' } })}
        style={styles.more}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md },
  number: { width: 28, alignItems: 'center' },
  numberText: { color: colors.textMuted, fontSize: 15, fontVariant: ['tabular-nums'] },
  text: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 16, fontWeight: '500' },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  subtitle: { color: colors.textMuted, fontSize: 13, flexShrink: 1 },
  more: { padding: 4 },
});
