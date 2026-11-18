import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors, M3 } from '@/theme';

type Props = { playing: boolean; onPress: () => void; size?: number; color?: string; iconColor?: string };

export function PlayButton({ playing, onPress, size = 56, color = colors.accent, iconColor = colors.onAccent }: Props) {
  return (
    <Pressable
      onPress={() => { haptic(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      style={({ pressed }) => ({
        width: size,
        height: size,
        // M3: a FAB-style rounded square; elsewhere a circle.
        borderRadius: M3 ? size * 0.3 : size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Ionicons
        name={playing ? 'pause' : 'play'}
        size={size * 0.45}
        color={iconColor}
        style={playing ? undefined : { marginLeft: size * 0.06 }}
      />
    </Pressable>
  );
}
