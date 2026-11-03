import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';

import { Artwork } from '@/components/Artwork';
import { closeSheet, Sheet, SheetAction } from '@/components/Sheet';
import { artistName, getAlbum, getTrack, trackColors } from '@/data/catalog';
import { useIsLiked, useLibrary } from '@/store/library';
import { usePlayer } from '@/store/player';
import { colors, spacing } from '@/theme';

export default function TrackOptions() {
  const { id, playlistId } = useLocalSearchParams<{ id: string; playlistId?: string }>();
  const track = getTrack(id);
  const liked = useIsLiked(id);
  const toggleLike = useLibrary((s) => s.toggleLike);
  const removeFromPlaylist = useLibrary((s) => s.removeFromPlaylist);
  const isUserPlaylist = useLibrary((s) => !!playlistId && s.userPlaylists.some((p) => p.id === playlistId));
  const playNext = usePlayer((s) => s.playNext);
  const addToQueue = usePlayer((s) => s.addToQueue);

  if (!track) {
    return (
      <Sheet>
        <Text style={styles.missing}>This song is no longer available.</Text>
      </Sheet>
    );
  }

  const run = (fn: () => void) => () => {
    fn();
    closeSheet();
  };

  const share = async () => {
    const message = `Listen to “${track.title}” by ${artistName(track)} on Paadal`;
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as Navigator | undefined;
      if (nav?.share) await nav.share({ text: message }).catch(() => {});
      else await nav?.clipboard?.writeText(message).catch(() => {});
    } else {
      await Share.share({ message }).catch(() => {});
    }
  };

  return (
    <Sheet
      header={
        <View style={styles.header}>
          <Artwork colors={trackColors(track)} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.artist}>{artistName(track)}</Text>
          </View>
        </View>
      }
    >
      <SheetAction
        icon={liked ? 'heart' : 'heart-outline'}
        color={liked ? colors.accent : colors.text}
        label={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
        onPress={run(() => toggleLike(track.id))}
      />
      <SheetAction icon="add-circle-outline" label="Add to playlist" onPress={() => router.replace({ pathname: '/add-to-playlist', params: { trackId: track.id } })} />
      {isUserPlaylist && playlistId && (
        <SheetAction icon="remove-circle-outline" label="Remove from this playlist" onPress={run(() => removeFromPlaylist(playlistId, track.id))} />
      )}
      <SheetAction icon="play-forward-outline" label="Play next" onPress={run(() => playNext(track))} />
      <SheetAction icon="list-outline" label="Add to queue" onPress={run(() => addToQueue(track))} />
      <SheetAction icon="disc-outline" label={`Go to album: ${getAlbum(track.albumId)?.title ?? ''}`} onPress={() => router.replace({ pathname: '/album/[id]', params: { id: track.albumId } })} />
      <SheetAction icon="person-outline" label="Go to artist" onPress={() => router.replace({ pathname: '/artist/[id]', params: { id: track.artistId } })} />
      <SheetAction icon="share-outline" label="Share" onPress={run(share)} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  artist: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  missing: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
