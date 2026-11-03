# Paadal

A music streaming app for **iOS, Android and the web**, built from one codebase with
[Expo](https://expo.dev) (React Native + React Native Web) and Expo Router.

> *Paadal* (பாடல்) means "song" in Tamil.

## Features

- **Home**: greeting, quick-access tiles, recently played, curated mixes, new albums, popular artists
- **Search**: live search across songs, artists, albums and playlists, plus "Browse all" genres
- **Your Library**: Liked Songs, your own playlists, saved playlists/albums, followed artists, with filters
- **Now Playing**: full-screen player with a draggable seek bar, shuffle, repeat (all / one), like, queue
- **Mini player** that floats above the tabs on every screen
- **Queue**: see what's next, jump to a song, remove songs, "Play next" / "Add to queue"
- **Playlists**: create, rename, delete, add/remove songs
- **Song options sheet**: like, add to playlist, play next, add to queue, go to album/artist, share
- **Background playback and lock-screen controls** on iOS/Android; Media Session controls on the web
- Library and the last queue are **saved on the device** (AsyncStorage / localStorage)

## Getting started

```bash
npm install
npm start          # then press i (iOS simulator), a (Android emulator) or w (web)
```

- Phone: install **Expo Go** and scan the QR code. Background audio needs a
  development build: `npx expo run:ios` / `npx expo run:android`, or `npx eas-cli build --profile development`.
- Web: `npm run web` for development, `npm run build:web` for a static site in `dist/`.

Checks:

```bash
npm run typecheck
npx expo lint
```

## Project layout

```
src/
  app/                    # Expo Router: every file is a screen
    _layout.tsx           # root stack + floating mini player
    (tabs)/               # Home, Search, Your Library
    album/[id].tsx  artist/[id].tsx  playlist/[id].tsx  liked.tsx
    player.tsx  queue.tsx           # Now Playing + queue
    track/[id].tsx  add-to-playlist.tsx  create-playlist.tsx   # sheets / modals
  components/             # TrackRow, MiniPlayer, SeekBar, CollectionView, Artwork, ...
  data/catalog.ts         # demo catalog (swap for your backend)
  store/player.ts         # playback engine (expo-audio) + queue/shuffle/repeat state
  store/library.ts        # likes, playlists, saved items, recently played (persisted)
```

## Music and content

The demo catalog is fictional, and its cover art is generated as gradients. The audio
streams from [SoundHelix](https://www.soundhelix.com)'s royalty-free example tracks.

To use your own audio, host files with the same names and set:

```bash
EXPO_PUBLIC_AUDIO_BASE_URL=https://your-cdn.example.com/audio npm start
```

### Going to production

Apps like Spotify, Apple Music and Amazon Music license their catalogs from labels and
distributors. To ship real music you need:

1. **Content rights**: licensed music (labels or aggregators), music you own, or
   royalty-free/Creative Commons tracks whose license allows streaming.
2. **A backend** for the catalog, search, user accounts and playlist sync (Supabase,
   Firebase, or your own API). Replace `src/data/catalog.ts` and move `store/library.ts`
   to that backend.
3. **Audio delivery**: a CDN serving the audio, ideally HLS for adaptive bitrate, with signed URLs.
4. **Store builds**: `npx eas-cli build -p ios|android` and `npx eas-cli submit`.
