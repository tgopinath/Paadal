import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Artwork } from '@/components/Artwork';
import type { Gradient } from '@/data/catalog';
import { colors, spacing } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  colors: Gradient;
  onPress: () => void;
  round?: boolean;
  size?: number;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function MediaCard({ title, subtitle, colors: gradient, onPress, round, size = 148, icon }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [{ width: size, opacity: pressed ? 0.75 : 1 }]}
    >
      <Artwork colors={gradient} size={size} label={round ? undefined : title} round={round} icon={icon ?? (round ? 'person' : undefined)} />
      <Text numberOfLines={1} style={[styles.title, round && { textAlign: 'center' }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text numberOfLines={2} style={[styles.subtitle, round && { textAlign: 'center' }]}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 16 },
});
