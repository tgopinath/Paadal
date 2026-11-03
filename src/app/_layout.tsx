import { DarkTheme, Stack, ThemeProvider, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/MiniPlayer';
import { colors, TAB_BAR_HEIGHT } from '@/theme';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, text: colors.text, border: colors.border },
};

/** Routes that cover the whole screen and therefore hide the mini player. */
const FULL_SCREEN_ROUTES = new Set(['player', 'queue', 'track', 'create-playlist', 'add-to-playlist']);

function FloatingMiniPlayer() {
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();
  if (FULL_SCREEN_ROUTES.has(segments[0])) return null;
  const inTabs = segments[0] === '(tabs)';
  const bottom = inTabs ? TAB_BAR_HEIGHT + insets.bottom + 4 : insets.bottom + 8;
  return (
    <View pointerEvents="box-none" style={[styles.mini, { bottom }]}>
      <MiniPlayer />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <View style={styles.root}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="queue" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen
              name="track/[id]"
              options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
            />
            <Stack.Screen
              name="add-to-playlist"
              options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
            />
            <Stack.Screen name="create-playlist" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
          <FloatingMiniPlayer />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  mini: { position: 'absolute', left: 0, right: 0, maxWidth: 900, alignSelf: 'center', width: '100%' },
});
