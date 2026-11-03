import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Props = {
  value: string;
  onChangeText: (s: string) => void;
  onSubmit: (s: string) => void;
  placeholder: string;
  label: string;
};

export function SearchField({ value, onChangeText, onSubmit, placeholder, label }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={20} color="#333" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit(value)}
        placeholder={placeholder}
        placeholderTextColor="#666"
        returnKeyType="search"
        autoCorrect={false}
        style={styles.input}
        accessibilityLabel={label}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel="Clear" hitSlop={8}>
          <Ionicons name="close-circle" size={20} color="#555" />
        </Pressable>
      )}
    </View>
  );
}

export function QuickPicks({ picks, onPick, active }: { picks: string[]; onPick: (q: string) => void; active?: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
      {picks.map((p) => (
        <Pressable
          key={p}
          onPress={() => onPick(p)}
          accessibilityRole="button"
          accessibilityState={{ selected: active === p }}
          style={[styles.chip, active === p && styles.chipActive]}
        >
          <Text style={[styles.chipText, active === p && styles.chipTextActive]}>{p}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F5F5F7',
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  input: { flex: 1, color: '#111', fontSize: 16, height: '100%', ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null) },
  chips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  chipActive: { backgroundColor: colors.text },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#111' },
});
