import { CollectionView } from '@/components/CollectionView';
import { resolveTracks } from '@/data/catalog';
import { useLibrary } from '@/store/library';

export default function LikedScreen() {
  const likedIds = useLibrary((s) => s.likedIds);
  return (
    <CollectionView
      contextLabel="liked"
      title="Liked Songs"
      kind="Playlist"
      meta="You"
      colors={['#5B2A86', '#FF7A45']}
      icon="heart"
      tracks={resolveTracks(likedIds)}
      emptyText="Songs you like will appear here. Tap the heart on any song to save it."
    />
  );
}
