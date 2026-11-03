import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { Notice } from '@/components/Notice';
import { YouTubeView } from '@/components/YouTubeView';
import { watchUrl } from '@/services/youtube';
import { useYouTube } from '@/store/youtube';
import { colors, radius, spacing } from '@/theme';

const close = () => (router.canGoBack() ? router.back() : router.replace('/film'));

export default function YouTubePlayerScreen() {
  const insets = useSafeAreaInsets();
  const { queue, index, next, previous, jumpTo, toggleSaved } = useYouTube();
  const video = queue[index];
  const saved = useYouTube((s) => !!video && s.saved.some((v) => v.id === video.id));
  // Errors belong to the video that raised them, so they clear when the video changes.
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);
  const error = failure && failure.id === video?.id ? failure.message : null;

  if (!video) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.muted}>No video selected.</Text>
        <Pressable onPress={close} accessibilityRole="button" style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.accent, fontWeight: '700' }}>Back to Film Songs</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton name="chevron-down" size={28} label="Close video" onPress={close} />
        <Text style={styles.headerTitle}>Now playing</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.playerWrap}>
        <YouTubeView videoId={video.id} onEnded={next} onError={(message) => setFailure({ id: video.id, message })} />
      </View>

      <FlatList
        data={queue}
        keyExtractor={(v, i) => `${v.id}-${i}`}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        ListHeaderComponent={
          <View>
            <View style={styles.meta}>
              <Text style={styles.title}>{video.title}</Text>
              <Text style={styles.muted}>{video.channel}</Text>
            </View>
            {error ? <Notice tone="error">{error}</Notice> : null}
            <View style={styles.controls}>
              <IconButton name="play-skip-back" size={30} label="Previous video" onPress={previous} disabled={index === 0} />
              <IconButton
                name={saved ? 'heart' : 'heart-outline'}
                size={28}
                color={saved ? colors.accent : colors.text}
                label={saved ? 'Remove from saved videos' : 'Save video'}
                onPress={() => toggleSaved(video)}
              />
              <IconButton name="play-skip-forward" size={30} label="Next video" onPress={next} disabled={index >= queue.length - 1} />
              <Pressable onPress={() => Linking.openURL(watchUrl(video.id))} accessibilityRole="link" style={styles.openYt}>
                <Text style={styles.openYtText}>Open in YouTube</Text>
              </Pressable>
            </View>
            {Platform.OS !== 'web' && (
              <Text style={styles.tip}>Tip: with YouTube Premium, “Open in YouTube” keeps the song playing with your screen locked.</Text>
            )}
            {queue.length > 1 && <Text style={styles.section}>Up next</Text>}
          </View>
        }
        renderItem={({ item, index: i }) =>
          queue.length > 1 ? (
            <Pressable
              onPress={() => jumpTo(i)}
              accessibilityRole="button"
              accessibilityLabel={`Play ${item.title}`}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
            >
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={[styles.rowTitle, i === index && { color: colors.accent }]}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.rowChannel}>{item.channel}</Text>
              </View>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  headerTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  playerWrap: { alignItems: 'center', backgroundColor: '#000' },
  meta: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: 4 },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  muted: { color: colors.textMuted, fontSize: 14 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  openYt: { marginLeft: 'auto', borderWidth: 1, borderColor: colors.textFaint, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 7 },
  openYtText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  tip: { color: colors.textMuted, fontSize: 12, paddingHorizontal: spacing.lg, lineHeight: 17 },
  section: { color: colors.text, fontSize: 17, fontWeight: '800', paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  thumb: { width: 112, height: 63, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  rowChannel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
