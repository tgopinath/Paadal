#!/bin/zsh
# Builds the Paadal iOS app (Apple HIG look) for the iPhone Simulator and copies it to ios-sim/Paadal.app.
# Builds in a temporary copy so the repo stays free of generated ios/ files. Needs Xcode with Swift 6.3 or newer
# (expo-modules-jsi 58.0.21+ does not compile with Xcode 26.1 / Swift 6.2) and CocoaPods.
#   zsh scripts/build-ios-sim.sh && xcrun simctl install booted ios-sim/Paadal.app && xcrun simctl launch booted com.paadal.app
set -e -o pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; WORK="$(mktemp -d)/paadal"
export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH" CI=1 LANG=en_US.UTF-8
mkdir -p "$WORK" && for f in "$ROOT"/*(D); do case "${f:t}" in amazon-pulse|.git|dist|paadal.apk|ios-sim) ;; *) cp -cR "$f" "$WORK/" ;; esac; done
cd "$WORK" && npx expo prebuild --platform ios --clean
cd ios && xcodebuild -workspace Paadal.xcworkspace -scheme Paadal -configuration Release -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath build CODE_SIGNING_ALLOWED=NO build | grep -E "error:|BUILD (SUCCEEDED|FAILED)"
rm -rf "$ROOT/ios-sim" && mkdir -p "$ROOT/ios-sim"
cp -R build/Build/Products/Release-iphonesimulator/Paadal.app "$ROOT/ios-sim/"
cd "$ROOT" && rm -rf "$(dirname "$WORK")"
echo "Built $ROOT/ios-sim/Paadal.app"
