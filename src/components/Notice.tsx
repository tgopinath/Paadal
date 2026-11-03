import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Props = { tone?: 'info' | 'error'; title?: string; children: string };

export function Notice({ tone = 'info', title, children }: Props) {
  const color = tone === 'error' ? colors.danger : colors.textMuted;
  return (
    <View style={[styles.box, tone === 'error' && { borderColor: colors.danger }]} accessibilityLiveRegion={tone === 'error' ? 'polite' : undefined}>
      <Ionicons name={tone === 'error' ? 'alert-circle' : 'information-circle'} size={20} color={color} />
      <View style={{ flex: 1 }}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={[styles.text, tone === 'error' && { color: colors.text }]}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  text: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
