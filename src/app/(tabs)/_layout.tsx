import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { colors, HIG, M3, m3, TAB_BAR_HEIGHT } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (active: IconName, inactive: IconName) =>
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    const glyph = <Ionicons name={focused ? active : inactive} color={color as string} size={M3 ? 24 : HIG ? 23 : size} />;
    if (!M3) return glyph;
    // M3 navigation bar: a 64 x 32 dp pill marks the active destination.
    return (
      <View style={{ width: 64, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? m3.secondaryContainer : 'transparent' }}>
        {glyph}
      </View>
    );
  };

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic('selection') }}
      screenOptions={{
        headerShown: false,
        // HIG: the tint marks the selected tab; M3: on-surface for the active label, on-surface-variant otherwise.
        tabBarActiveTintColor: HIG ? colors.accent : M3 ? m3.onSecondaryContainer : colors.text,
        tabBarInactiveTintColor: M3 ? m3.onSurfaceVariant : colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.bar,
          borderTopColor: colors.border,
          borderTopWidth: M3 ? 0 : HIG ? 0.5 : 1,
          elevation: 0,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: M3 ? 12 : HIG ? 2 : 4,
        },
        tabBarLabelStyle: M3
          ? { fontSize: 12, fontWeight: '500', marginTop: 4, color: m3.onSurface }
          : HIG
            ? { fontSize: 10, fontWeight: '500', marginBottom: 2 }
            : { fontSize: 11, fontWeight: '600' },
        ...(M3 ? { tabBarIconStyle: { width: 64, height: 32 } } : null),
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: icon('search', 'search-outline') }} />
      <Tabs.Screen name="film" options={{ title: 'Film Songs', tabBarIcon: icon('film', 'film-outline') }} />
      <Tabs.Screen name="library" options={{ title: HIG ? 'Library' : 'Your Library', tabBarIcon: icon('library', 'library-outline') }} />
    </Tabs>
  );
}
