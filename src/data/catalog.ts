/**
 * Demo catalog. All artists, albums and playlists are fictional.
 * Audio is streamed from SoundHelix's royalty-free example tracks
 * (https://www.soundhelix.com), which are algorithmically generated music.
 *
 * Swap this module for calls to your own backend / licensed catalog API
 * when you move beyond the prototype; the rest of the app only depends on
 * the types and lookup helpers exported here.
 */

export type Gradient = readonly [string, string];

export type Artist = {
  id: string;
  name: string;
  bio: string;
  colors: Gradient;
};

export type Album = {
  id: string;
  title: string;
  artistId: string;
  year: number;
  colors: Gradient;
};

export type Track = {
  id: string;
  title: string;
  artistId: string;
  albumId: string;
  url: string;
};

export type Playlist = {
  id: string;
  title: string;
  description: string;
  colors: Gradient;
  trackIds: string[];
  /** Genre playlists show up in Search → Browse all. */
  genre?: boolean;
};

/**
 * Where audio files are streamed from. Override with EXPO_PUBLIC_AUDIO_BASE_URL
 * (e.g. your own CDN / storage bucket holding files with the same names).
 */
const AUDIO_BASE_URL = (process.env.EXPO_PUBLIC_AUDIO_BASE_URL || 'https://www.soundhelix.com/examples/mp3').replace(/\/$/, '');
const song = (n: number) => `${AUDIO_BASE_URL}/SoundHelix-Song-${n}.mp3`;

export const artists: Artist[] = [
  { id: 'ar-neon', name: 'Neon Monsoon', bio: 'Synth-soaked grooves recorded between rain storms.', colors: ['#7F5AF0', '#2CB1BC'] },
  { id: 'ar-velvet', name: 'Velvet Orbit', bio: 'Slow-burn electronica for late nights and long drives.', colors: ['#E4405F', '#5B2A86'] },
  { id: 'ar-kavi', name: 'Kavi & The Tides', bio: 'A coastal collective blending piano, strings and drum machines.', colors: ['#00B4D8', '#0B3D91'] },
  { id: 'ar-ember', name: 'Ember Lane', bio: 'Warm, analog-flavoured beats with a sunrise feel.', colors: ['#FF7A45', '#B5179E'] },
  { id: 'ar-paper', name: 'Paper Lanterns', bio: 'Lo-fi daydreams stitched together from tape loops.', colors: ['#F9C74F', '#F3722C'] },
  { id: 'ar-glass', name: 'Glasshouse Echo', bio: 'Shimmering arpeggios and big, roomy reverbs.', colors: ['#43AA8B', '#277DA1'] },
];

export const albums: Album[] = [
  { id: 'al-monsoon', title: 'Monsoon Circuits', artistId: 'ar-neon', year: 2025, colors: ['#7F5AF0', '#16161D'] },
  { id: 'al-orbit', title: 'Low Orbit', artistId: 'ar-velvet', year: 2024, colors: ['#E4405F', '#1A1033'] },
  { id: 'al-tides', title: 'Salt & Static', artistId: 'ar-kavi', year: 2026, colors: ['#00B4D8', '#071A3A'] },
  { id: 'al-ember', title: 'First Light', artistId: 'ar-ember', year: 2025, colors: ['#FF7A45', '#3D0A3A'] },
  { id: 'al-paper', title: 'Tape Weather', artistId: 'ar-paper', year: 2023, colors: ['#F9C74F', '#5A2A0C'] },
  { id: 'al-glass', title: 'Clear Rooms', artistId: 'ar-glass', year: 2026, colors: ['#43AA8B', '#0F2A3A'] },
];

export const tracks: Track[] = [
  { id: 't1', title: 'Rainline', artistId: 'ar-neon', albumId: 'al-monsoon', url: song(1) },
  { id: 't2', title: 'Signal Bloom', artistId: 'ar-neon', albumId: 'al-monsoon', url: song(2) },
  { id: 't3', title: 'Puddle Lights', artistId: 'ar-neon', albumId: 'al-monsoon', url: song(3) },
  { id: 't4', title: 'Gravity Well', artistId: 'ar-velvet', albumId: 'al-orbit', url: song(4) },
  { id: 't5', title: 'Afterglow Drift', artistId: 'ar-velvet', albumId: 'al-orbit', url: song(5) },
  { id: 't6', title: 'Night Shift Satellites', artistId: 'ar-velvet', albumId: 'al-orbit', url: song(6) },
  { id: 't7', title: 'Harbour Keys', artistId: 'ar-kavi', albumId: 'al-tides', url: song(7) },
  { id: 't8', title: 'Undertow', artistId: 'ar-kavi', albumId: 'al-tides', url: song(8) },
  { id: 't9', title: 'Lighthouse Pulse', artistId: 'ar-kavi', albumId: 'al-tides', url: song(9) },
  { id: 't10', title: 'Golden Hour Engine', artistId: 'ar-ember', albumId: 'al-ember', url: song(10) },
  { id: 't11', title: 'Copper Skies', artistId: 'ar-ember', albumId: 'al-ember', url: song(11) },
  { id: 't12', title: 'Window Seat', artistId: 'ar-paper', albumId: 'al-paper', url: song(12) },
  { id: 't13', title: 'Cassette Clouds', artistId: 'ar-paper', albumId: 'al-paper', url: song(13) },
  { id: 't14', title: 'Prism Steps', artistId: 'ar-glass', albumId: 'al-glass', url: song(14) },
  { id: 't15', title: 'Mirror Garden', artistId: 'ar-glass', albumId: 'al-glass', url: song(15) },
  { id: 't16', title: 'Open Ceiling', artistId: 'ar-glass', albumId: 'al-glass', url: song(16) },
];

export const playlists: Playlist[] = [
  { id: 'pl-daily', title: 'Daily Mix', description: 'A little of everything, picked for today.', colors: ['#FF7A45', '#7F5AF0'], trackIds: ['t1', 't7', 't10', 't14', 't4', 't12'] },
  { id: 'pl-focus', title: 'Deep Focus', description: 'Keep calm and stay in the zone.', colors: ['#277DA1', '#0B0B0F'], trackIds: ['t8', 't13', 't15', 't5', 't3'] },
  { id: 'pl-drive', title: 'Night Drive', description: 'City lights, open roads, no rush.', colors: ['#5B2A86', '#E4405F'], trackIds: ['t6', 't4', 't2', 't16', 't9'] },
  { id: 'pl-morning', title: 'Morning Coffee', description: 'Ease into the day.', colors: ['#F9C74F', '#43AA8B'], trackIds: ['t12', 't11', 't7', 't13', 't10'] },
  { id: 'pl-new', title: 'Fresh Finds', description: 'New releases from artists we love.', colors: ['#00B4D8', '#B5179E'], trackIds: ['t9', 't14', 't15', 't16', 't7'] },
  { id: 'g-electronic', title: 'Electronic', description: 'Synths, sequencers and everything in between.', colors: ['#7F5AF0', '#2CB1BC'], trackIds: ['t1', 't2', 't4', 't6', 't14'], genre: true },
  { id: 'g-chill', title: 'Chill', description: 'Low tempo, high comfort.', colors: ['#43AA8B', '#277DA1'], trackIds: ['t5', 't12', 't13', 't15'], genre: true },
  { id: 'g-ambient', title: 'Ambient', description: 'Space to think.', colors: ['#0B3D91', '#00B4D8'], trackIds: ['t8', 't9', 't16', 't3'], genre: true },
  { id: 'g-workout', title: 'Workout', description: 'Push a little harder.', colors: ['#E4405F', '#FF7A45'], trackIds: ['t10', 't2', 't6', 't11'], genre: true },
  { id: 'g-lofi', title: 'Lo-fi', description: 'Dusty beats for slow afternoons.', colors: ['#F3722C', '#F9C74F'], trackIds: ['t12', 't13', 't11'], genre: true },
  { id: 'g-piano', title: 'Piano & Keys', description: 'Melodies first.', colors: ['#2CB1BC', '#5B2A86'], trackIds: ['t7', 't9', 't15'], genre: true },
];

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const artistMap = byId(artists);
const albumMap = byId(albums);
const trackMap = byId(tracks);
const playlistMap = byId(playlists);

export const getArtist = (id: string) => artistMap.get(id);
export const getAlbum = (id: string) => albumMap.get(id);
export const getTrack = (id: string) => trackMap.get(id);
export const getPlaylist = (id: string) => playlistMap.get(id);

export const resolveTracks = (ids: string[]) =>
  ids.map((id) => trackMap.get(id)).filter((t): t is Track => !!t);

export const tracksForAlbum = (albumId: string) => tracks.filter((t) => t.albumId === albumId);
export const tracksForArtist = (artistId: string) => tracks.filter((t) => t.artistId === artistId);
export const albumsForArtist = (artistId: string) => albums.filter((a) => a.artistId === artistId);

export const artistName = (t: Track) => getArtist(t.artistId)?.name ?? 'Unknown artist';
export const trackColors = (t: Track): Gradient => getAlbum(t.albumId)?.colors ?? ['#333', '#111'];

export function search(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { tracks: [], artists: [], albums: [], playlists: [] };
  const has = (s: string) => s.toLowerCase().includes(q);
  return {
    tracks: tracks.filter((t) => has(t.title) || has(artistName(t)) || has(getAlbum(t.albumId)?.title ?? '')),
    artists: artists.filter((a) => has(a.name)),
    albums: albums.filter((a) => has(a.title) || has(getArtist(a.artistId)?.name ?? '')),
    playlists: playlists.filter((p) => has(p.title) || has(p.description)),
  };
}
