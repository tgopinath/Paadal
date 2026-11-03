import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { CollectionView } from '@/components/CollectionView';
import { IconButton } from '@/components/IconButton';
import { NotFound } from '@/components/NotFound';
import { getAlbum, getArtist, tracksForAlbum } from '@/data/catalog';
import { useLibrary } from '@/store/library';
import { colors } from '@/theme';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const album = getAlbum(id);
  const saved = useLibrary((s) => s.savedAlbumIds.includes(id));
  const toggleSaved = useLibrary((s) => s.toggleSavedAlbum);
  if (!album) return <NotFound what="album" />;
  const artist = getArtist(album.artistId);

  return (
    <CollectionView
      contextLabel={`album:${album.id}`}
      title={album.title}
      kind="Album"
      meta={String(album.year)}
      colors={album.colors}
      tracks={tracksForAlbum(album.id)}
      numbered
      actions={
        <>
          {artist && (
            <Pressable onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })} accessibilityRole="link">
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{artist.name}</Text>
            </Pressable>
          )}
          <IconButton
            name={saved ? 'heart' : 'heart-outline'}
            color={saved ? colors.accent : colors.textMuted}
            label={saved ? 'Remove album from Your Library' : 'Save album to Your Library'}
            onPress={() => toggleSaved(album.id)}
          />
        </>
      }
    />
  );
}
