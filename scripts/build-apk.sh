#!/bin/zsh
# Builds the Paadal Android APK (Material Design 3 look) without EAS and uploads it to release v1.0.0,
# which the portfolio links to. Builds in a temporary copy so the repo stays free of generated android/ files.
#   zsh scripts/build-apk.sh            (NO_UPLOAD=1 to only build)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; WORK="$(mktemp -d)/paadal"
mkdir -p "$WORK" && for f in "$ROOT"/*(D); do case "${f:t}" in amazon-pulse|.git|dist|paadal.apk|ios-sim) ;; *) cp -cR "$f" "$WORK/" ;; esac; done
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ANDROID_HOME="$HOME/Library/Android/sdk" CI=1
cd "$WORK" && npx expo prebuild --platform android --no-install --clean
cd android && ./gradlew --no-daemon --init-script "$ROOT/scripts/maven-mirror.gradle" assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64
cp app/build/outputs/apk/release/app-release.apk "$ROOT/paadal.apk"
cd "$ROOT" && rm -rf "$(dirname "$WORK")"
[ -n "$NO_UPLOAD" ] && { echo "Built $ROOT/paadal.apk (not uploaded)"; exit 0; }
~/.local/bin/gh release view v1.0.0 -R tgopinath/Paadal >/dev/null 2>&1 || ~/.local/bin/gh release create v1.0.0 -R tgopinath/Paadal --target main --title "Paadal 1.0.0" --notes "Paadal for Android (Material Design 3). Demo catalogue with royalty-free SoundHelix tracks."
~/.local/bin/gh release upload v1.0.0 "$ROOT/paadal.apk" -R tgopinath/Paadal --clobber
echo "Uploaded to https://github.com/tgopinath/Paadal/releases/download/v1.0.0/paadal.apk"
