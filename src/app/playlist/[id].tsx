import { router, useLocalSearchParams } from 'expo-router';

import { CollectionView } from '@/components/CollectionView';
import { IconButton } from '@/components/IconButton';
import { NotFound } from '@/components/NotFound';
import { getPlaylist, resolveTracks } from '@/data/catalog';
import { confirm } from '@/lib/confirm';
import { useLibrary } from '@/store/library';
import { colors } from '@/theme';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userPlaylist = useLibrary((s) => s.userPlaylists.find((p) => p.id === id));
  const saved = useLibrary((s) => s.savedPlaylistIds.includes(id));
  const toggleSaved = useLibrary((s) => s.toggleSavedPlaylist);
  const deletePlaylist = useLibrary((s) => s.deletePlaylist);

  if (userPlaylist) {
    const onDelete = async () => {
      if (await confirm('Delete playlist?', `“${userPlaylist.title}” will be removed from Your Library.`)) {
        deletePlaylist(userPlaylist.id);
        if (router.canGoBack()) router.back();
        else router.replace('/library');
      }
    };
    return (
      <CollectionView
        contextLabel={`playlist:${userPlaylist.id}`}
        title={userPlaylist.title}
        kind="Playlist"
        meta="You"
        colors={userPlaylist.colors}
        tracks={resolveTracks(userPlaylist.trackIds)}
        playlistId={userPlaylist.id}
        emptyText="This playlist is empty. Use ••• on any song and choose “Add to playlist”."
        actions={
          <>
            <IconButton name="pencil" color={colors.textMuted} label="Rename playlist" onPress={() => router.push({ pathname: '/create-playlist', params: { renameId: userPlaylist.id } })} />
            <IconButton name="trash-outline" color={colors.textMuted} label="Delete playlist" onPress={onDelete} />
          </>
        }
      />
    );
  }

  const playlist = getPlaylist(id);
  if (!playlist) return <NotFound what="playlist" />;
  return (
    <CollectionView
      contextLabel={`playlist:${playlist.id}`}
      title={playlist.title}
      kind={playlist.genre ? 'Genre' : 'Playlist'}
      meta="Paadal"
      description={playlist.description}
      colors={playlist.colors}
      tracks={resolveTracks(playlist.trackIds)}
      actions={
        <IconButton
          name={saved ? 'heart' : 'heart-outline'}
          color={saved ? colors.accent : colors.textMuted}
          label={saved ? 'Remove playlist from Your Library' : 'Save playlist to Your Library'}
          onPress={() => toggleSaved(playlist.id)}
        />
      }
    />
  );
}
