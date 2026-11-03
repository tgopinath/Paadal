import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

// Spotify redirects here after sign-in. On the web this page runs in the
// sign-in popup: it hands the result back to the app window and closes.
WebBrowser.maybeCompleteAuthSession();

export default function SpotifyAuthRedirect() {
  useEffect(() => {
    // If this page was opened directly (not as a popup), go back to the app.
    const t = setTimeout(() => router.replace('/film'), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.screen}>
      <ActivityIndicator color={colors.text} />
      <Text style={styles.text}>Finishing Spotify sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  text: { color: colors.textMuted, fontSize: 15 },
});
