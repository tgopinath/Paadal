import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type { Gradient } from '@/data/catalog';

type Props = {
  colors: Gradient;
  size: number;
  /** Text printed on the cover (album / playlist name). Hidden on tiny covers. */
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  round?: boolean;
  style?: ViewStyle;
};

/** Generated cover art: a gradient with the title, so the demo needs no image assets. */
export function Artwork({ colors, size, label, icon, round, style }: Props) {
  const showLabel = !!label && size >= 96;
  return (
    <LinearGradient
      colors={[colors[0], colors[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        { width: size, height: size, borderRadius: round ? size / 2 : Math.max(4, size * 0.04) },
        styles.base,
        style,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={size * 0.4} color="rgba(255,255,255,0.92)" />
      ) : showLabel ? (
        <View style={styles.labelWrap}>
          <Text numberOfLines={3} style={[styles.label, { fontSize: Math.max(12, size * 0.11) }]}>
            {label}
          </Text>
        </View>
      ) : (
        <Ionicons name="musical-notes" size={size * 0.38} color="rgba(255,255,255,0.55)" />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  labelWrap: { ...StyleSheet.absoluteFill, padding: '10%', justifyContent: 'flex-end' },
  label: { color: '#fff', fontWeight: '800', letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 },
});
