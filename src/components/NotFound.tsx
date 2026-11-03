import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export function NotFound({ what }: { what: string }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>We couldn’t find that {what}.</Text>
      <Pressable style={styles.button} onPress={() => router.replace('/')} accessibilityRole="button">
        <Text style={styles.buttonText}>Go home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  button: { marginTop: spacing.lg, backgroundColor: colors.text, borderRadius: radius.pill, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  buttonText: { color: '#111', fontWeight: '700' },
});
