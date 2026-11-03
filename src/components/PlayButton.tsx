import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { colors } from '@/theme';

type Props = { playing: boolean; onPress: () => void; size?: number; color?: string; iconColor?: string };

export function PlayButton({ playing, onPress, size = 56, color = colors.accent, iconColor = '#111' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
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
