/**
 * Keys for the streaming integrations. Set them as environment variables
 * (see README → "Film songs: Spotify and YouTube"). Both are visible in the
 * app's code once built, so restrict them in the providers' dashboards.
 */
export const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
export const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';

/** Searches offered as one-tap chips on the Film Songs tab. */
export const FILM_SONG_QUICK_PICKS = [
  'Tamil film songs',
  'Hindi film songs',
  'Telugu film songs',
  'Malayalam film songs',
  'Kannada film songs',
  '90s Tamil hits',
  'Latest Tamil songs',
  'Bollywood romantic songs',
];
