import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Artwork } from '@/components/Artwork';
import { closeSheet, Sheet, SheetAction } from '@/components/Sheet';
import { songCount } from '@/lib/format';
import { useLibrary } from '@/store/library';
import { colors, spacing } from '@/theme';

export default function AddToPlaylist() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const userPlaylists = useLibrary((s) => s.userPlaylists);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);

  return (
    <Sheet header={<Text style={styles.heading} accessibilityRole="header">Add to playlist</Text>}>
      <SheetAction icon="add" label="New playlist" onPress={() => router.replace({ pathname: '/create-playlist', params: { trackId } })} />
      {userPlaylists.map((p) => {
        const already = p.trackIds.includes(trackId);
        return (
          <Pressable
            key={p.id}
            disabled={already}
            onPress={() => {
              addToPlaylist(p.id, trackId);
              closeSheet();
            }}
            accessibilityRole="button"
            accessibilityLabel={already ? `${p.title}, already added` : `Add to ${p.title}`}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceRaised }, already && { opacity: 0.45 }]}
          >
            <Artwork colors={p.colors} size={44} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.title}>{p.title}</Text>
              <Text style={styles.meta}>{already ? 'Already added' : songCount(p.trackIds.length)}</Text>
            </View>
          </Pressable>
        );
      })}
      {userPlaylists.length === 0 && <Text style={styles.empty}>You don’t have any playlists yet.</Text>}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  heading: { color: colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center', paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  title: { color: colors.text, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
});
