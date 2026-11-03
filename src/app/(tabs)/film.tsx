import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPOTIFY_GREEN, SpotifyPanel } from '@/components/SpotifyPanel';
import { YOUTUBE_RED, YouTubePanel } from '@/components/YouTubePanel';
import { colors, MINI_PLAYER_HEIGHT, radius, spacing } from '@/theme';

type Source = 'spotify' | 'youtube';

const SOURCES: { key: Source; label: string; icon: 'spotify' | 'youtube-play'; color: string }[] = [
  { key: 'spotify', label: 'Spotify', icon: 'spotify', color: SPOTIFY_GREEN },
  { key: 'youtube', label: 'YouTube', icon: 'youtube-play', color: YOUTUBE_RED },
];

export default function FilmSongsScreen() {
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState<Source>('spotify');

  return (
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: MINI_PLAYER_HEIGHT + spacing.xxl }}
    >
      <Text style={styles.heading} accessibilityRole="header">Film Songs</Text>
      <Text style={styles.sub}>Tamil, Hindi, Telugu, Malayalam and Kannada film music.</Text>

      <View style={styles.segment} accessibilityRole="tablist">
        {SOURCES.map((s) => {
          const active = s.key === source;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSource(s.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segmentItem, active && styles.segmentActive]}
            >
              <FontAwesome name={s.icon} size={16} color={active ? s.color : colors.textMuted} />
              <Text style={[styles.segmentText, active && { color: colors.text }]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {source === 'spotify' ? <SpotifyPanel /> : <YouTubePanel />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, paddingHorizontal: spacing.lg },
  sub: { color: colors.textMuted, fontSize: 14, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  segment: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 9, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.surfaceRaised },
  segmentText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
});
