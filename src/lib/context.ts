import { getAlbum, getArtist, getPlaylist } from '@/data/catalog';
import { useLibrary } from '@/store/library';

/** Human-readable "Playing from …" text for a player context label. */
export function describeContext(label: string): string {
  const [kind, id] = label.split(':');
  switch (kind) {
    case 'album':
      return getAlbum(id)?.title ?? 'Album';
    case 'artist':
      return getArtist(id)?.name ?? 'Artist';
    case 'playlist':
      return getPlaylist(id)?.title ?? useLibrary.getState().userPlaylists.find((p) => p.id === id)?.title ?? 'Playlist';
    case 'liked':
      return 'Liked Songs';
    default:
      return label || 'Your queue';
  }
}
