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
- **Film Songs** tab: Indian film music through **Spotify** (keeps playing with the screen locked)
  and **YouTube** (official embedded player)

## Getting started

```bash
npm install
npm start          # then press i (iOS simulator), a (Android emulator) or w (web)
```

- Phone: install **Expo Go** and scan the QR code. Background audio needs a
  development build: `npx expo run:ios` / `npx expo run:android`, or `npx eas-cli build --profile development`.
- Web: `npm run web` for development, `npm run build:web` for a static site in `dist/`.
- Live web app: https://tgopinath.github.io/Paadal/, rebuilt automatically on every push to `main`
  (`.github/workflows/deploy-web.yml`).

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

## Film songs: Spotify and YouTube

The **Film Songs** tab plays Tamil, Hindi, Telugu, Malayalam and Kannada film music without
Paadal hosting any copyrighted audio.

### Spotify (lock-screen listening)

Paadal signs in to the listener's Spotify account and tells **their Spotify app** what to play
(Spotify Connect, through the Web API). Spotify does the playback, so it keeps going with the
screen locked. Listeners need the Spotify app (or an open Spotify web player) and **Spotify Premium**.

1. Go to <https://developer.spotify.com/dashboard>, then **Create app**, and choose **Web API**.
2. Add these **Redirect URIs** exactly:
   - `https://tgopinath.github.io/Paadal/spotify-auth` (the live website)
   - `paadal://spotify-auth` (iOS/Android builds)
   - `http://127.0.0.1:8081/spotify-auth` (local web development; open the app at `127.0.0.1`, not `localhost`)
3. Copy the **Client ID**. It's not a secret, and there's no client secret: Paadal uses PKCE sign-in.
4. While the app is in Spotify's *development mode*, only the Spotify accounts you add under
   **User Management** can sign in. Opening it to everyone requires Spotify's quota-extension review.

### YouTube

Videos play in YouTube's official embedded player, which must stay visible. YouTube's rules for
other apps don't allow audio-only or background playback, even for Premium subscribers. On phones,
the player's **Open in YouTube** button hands the video to the YouTube app, where Premium members
can keep listening with the screen locked. Pasting a YouTube link works without any key. **Search**
needs an API key:

1. In <https://console.cloud.google.com>, create a project and enable **YouTube Data API v3**.
2. Under **Credentials**, create an **API key**. Restrict it to the YouTube Data API and, for the
   website, to the HTTP referrer `https://tgopinath.github.io/*`. The key ends up in the app's code.
3. The default quota is 10,000 units a day. Each search costs 100, so that's about 100 searches a
   day (results are cached per search while the app is open).

### Adding the keys

- **Live website**: in GitHub, go to **Settings → Secrets and variables → Actions → Variables**
  and add `SPOTIFY_CLIENT_ID` and `YOUTUBE_API_KEY`. Then re-run **Deploy web app** from the **Actions** tab (or push to `main`).
- **Local / app builds**: create a `.env.local` file (it's git-ignored):

  ```bash
  EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your-client-id
  EXPO_PUBLIC_YOUTUBE_API_KEY=your-api-key
  ```

The Spotify sign-in and the YouTube player need a development build on iOS/Android
(`npx expo run:ios` / `run:android`), not Expo Go.

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
