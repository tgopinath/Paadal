import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { HIG } from '@/theme';

/** Light haptic feedback in the iPhone app (Apple HIG); nothing on Android or the web. */
export function haptic(kind: 'selection' | 'light' = 'light') {
  if (!HIG || Platform.OS !== 'ios') return;
  if (kind === 'selection') Haptics.selectionAsync();
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
