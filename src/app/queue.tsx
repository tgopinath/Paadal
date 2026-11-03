import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/Artwork';
import { IconButton } from '@/components/IconButton';
import { artistName, getTrack, trackColors, type Track } from '@/data/catalog';
import { describeContext } from '@/lib/context';
import { usePlayer } from '@/store/player';
import { colors, spacing } from '@/theme';

function Row({ track, active, onPress, onRemove }: { track: Track; active?: boolean; onPress?: () => void; onRemove?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={`Play ${track.title}`} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
      <Artwork colors={trackColors(track)} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[styles.title, active && { color: colors.accent }]}>{track.title}</Text>
        <Text numberOfLines={1} style={styles.artist}>{artistName(track)}</Text>
      </View>
      {onRemove && <IconButton name="remove-circle-outline" size={22} color={colors.textMuted} label={`Remove ${track.title} from queue`} onPress={onRemove} />}
    </Pressable>
  );
}

export default function QueueScreen() {
  const insets = useSafeAreaInsets();
  const { queue, index, contextLabel, jumpTo, removeFromQueue } = usePlayer();
  const current = queue[index] ? getTrack(queue[index]) : undefined;
  const upcoming = queue.slice(index + 1).map((id, i) => ({ track: getTrack(id), queueIndex: index + 1 + i }));

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <IconButton name="chevron-down" size={28} label="Close queue" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text style={styles.heading} accessibilityRole="header">Queue</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={upcoming}
        keyExtractor={(item) => `${item.queueIndex}-${item.track?.id}`}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        ListHeaderComponent={
          <>
            <Text style={styles.section}>Now playing</Text>
            {current ? <Row track={current} active /> : <Text style={styles.empty}>Nothing is playing.</Text>}
            {upcoming.length > 0 && <Text style={styles.section}>Next from: {describeContext(contextLabel)}</Text>}
          </>
        }
        renderItem={({ item }) =>
          item.track ? <Row track={item.track} onPress={() => jumpTo(item.queueIndex)} onRemove={() => removeFromQueue(item.queueIndex)} /> : null
        }
        ListEmptyComponent={current ? <Text style={styles.empty}>No more songs queued. Add some with “Add to queue”.</Text> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  heading: { color: colors.text, fontSize: 16, fontWeight: '700' },
  section: { color: colors.text, fontSize: 17, fontWeight: '800', paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  title: { color: colors.text, fontSize: 15, fontWeight: '500' },
  artist: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  empty: { color: colors.textMuted, fontSize: 14, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
