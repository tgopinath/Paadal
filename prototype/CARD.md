# Paadal

**Pitch:** A music streaming app built once in Expo for iPhone, Android and the web.

**Description:** Paadal (பாடல், "song") has everything a listener expects: a home feed of mixes and albums, live search, a library with liked songs and playlists, a full-screen player with seek, shuffle, repeat and a queue, and a mini player that follows you across tabs. One React Native codebase renders Material Design 3 inside the Android app, Apple's Human Interface Guidelines inside the iPhone app, and Paadal's own dark look on the web. The demo catalogue is fictional and plays royalty-free SoundHelix example tracks; Film Songs play only through YouTube's official player or the listener's own Spotify app.

**Tags:** Expo, React Native, iOS, Android, Web, Material 3, Apple HIG, Music, Tamil name

**Live:** https://paadal-two.vercel.app (previews: `?app=android`, `?app=ios`)
**APK:** https://github.com/tgopinath/Paadal/releases/download/v1.0.0/paadal.apk (72.2 MB)
**iOS:** native Expo build from the same repo (`scripts/build-ios-sim.sh`), no separate iOS shell repo
**Repo:** https://github.com/tgopinath/Paadal (branch main; `amazon-pulse/` is a separate app)
**Stack:** Expo SDK 58, React Native 0.88, Expo Router, expo-audio, Zustand, AsyncStorage; web export on Vercel
**Status:** live, ready for a card

**Shots:** `prototype/shots/home-ios.jpg`, `playlist-android.jpg`, `player-ios.jpg`, `search-android.jpg` (600 wide), `web.jpg` (1440x900). Phone frame: `prototype/mobile.html`.
