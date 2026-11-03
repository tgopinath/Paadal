import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/Artwork';
import { IconButton } from '@/components/IconButton';
import { PlayButton } from '@/components/PlayButton';
import { TrackRow } from '@/components/TrackRow';
import type { Gradient, Track } from '@/data/catalog';
import { songCount } from '@/lib/format';
import { usePlayer } from '@/store/player';
import { colors, MINI_PLAYER_HEIGHT, spacing } from '@/theme';

type Props = {
  /** Identifies this collection as a playback context ("is this list playing?"). */
  contextLabel: string;
  title: string;
  kind: string;
  description?: string;
  meta?: string;
  colors: Gradient;
  tracks: Track[];
  icon?: keyof typeof Ionicons.glyphMap;
  numbered?: boolean;
  playlistId?: string;
  emptyText?: string;
  /** Extra action buttons shown next to shuffle (save, delete...). */
  actions?: ReactNode;
};

export function CollectionView(props: Props) {
  const { contextLabel, title, kind, description, meta, colors: gradient, tracks, icon, numbered, playlistId, emptyText, actions } = props;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const coverSize = Math.min(240, width * 0.6);

  const playTracks = usePlayer((s) => s.playTracks);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const shuffle = usePlayer((s) => s.shuffle);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const isThisContext = usePlayer((s) => s.contextLabel === contextLabel && s.queue.length > 0);

  const onPlayAll = () => {
    if (isThisContext) togglePlay();
    else playTracks(tracks, 0, contextLabel);
  };

  const header = (
    <View>
      <LinearGradient colors={[gradient[0], colors.bg]} locations={[0, 0.95]} style={[styles.hero, { paddingTop: insets.top + 56 }]}>
        <Artwork colors={gradient} size={coverSize} label={icon ? undefined : title} icon={icon} style={styles.cover} />
      </LinearGradient>
      <View style={styles.info}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        <Text style={styles.meta}>
          {kind}
          {meta ? ` • ${meta}` : ''} • {songCount(tracks.length)}
        </Text>
        <View style={styles.actions}>
          <View style={styles.actionsLeft}>{actions}</View>
          <IconButton
            name="shuffle"
            size={26}
            color={shuffle ? colors.accent : colors.textMuted}
            label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
            onPress={toggleShuffle}
          />
          <PlayButton playing={isThisContext && isPlaying} onPress={onPlayAll} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={tracks}
        keyExtractor={(t, i) => `${t.id}-${i}`}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            number={numbered ? index + 1 : undefined}
            playlistId={playlistId}
            onPress={() => playTracks(tracks, index, contextLabel)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyText ?? 'Nothing here yet.'}</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: MINI_PLAYER_HEIGHT + insets.bottom + spacing.xxl }}
      />
      <BackButton />
    </View>
  );
}

export function BackButton() {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={[styles.back, { top: insets.top + spacing.sm }]}
    >
      <Ionicons name="chevron-back" size={24} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { alignItems: 'center', paddingBottom: spacing.xl },
  cover: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  info: { paddingHorizontal: spacing.lg },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  description: { color: colors.textMuted, fontSize: 14, marginTop: spacing.sm, lineHeight: 20 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md, gap: spacing.md },
  actionsLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  empty: { padding: spacing.xxl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  back: {
    position: 'absolute',
    left: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
