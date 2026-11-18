import { Platform, type TextStyle } from 'react-native';

/**
 * Native looks. The website keeps Paadal's own dark look; the Android app follows Material Design 3
 * and the iPhone app follows Apple's Human Interface Guidelines (the same split as every Kolam app).
 * On the web, `?app=android` or `?app=ios` previews them. If both could apply, iOS wins.
 */
const query = Platform.OS === 'web' && typeof location !== 'undefined' ? location.search : '';
export const HIG = Platform.OS === 'ios' || /[?&]app=ios\b/.test(query);
export const M3 = !HIG && (Platform.OS === 'android' || /[?&]app=android\b/.test(query));

const web = {
  bg: '#0B0B0F',
  surface: '#16161D',
  surfaceRaised: '#1F1F29',
  border: '#2A2A36',
  text: '#F5F5F7',
  textMuted: '#A1A1AE',
  textFaint: '#6B6B78',
  accent: '#FF7A45',
  onAccent: '#111111',
  accentDim: '#FF7A4533',
  danger: '#FF5470',
  /** Navigation bar background. */
  bar: 'rgba(11,11,15,0.97)',
};

/**
 * Material 3 dark roles from the Kolam M3 kit's generator for Paadal's orange:
 * node -e "console.log(require('kolam-design-system/m3/kolam-m3.js').scheme('#FF7A45').dark)"
 */
export const m3 = {
  primary: '#ffb598',
  onPrimary: '#5a1c00',
  primaryContainer: '#832600',
  onPrimaryContainer: '#ffdbcd',
  secondaryContainer: '#5f3f33',
  onSecondaryContainer: '#ffdbcd',
  surface: '#1a110d',
  onSurface: '#ece0db',
  onSurfaceVariant: '#d9c2b9',
  surfaceContainerLow: '#221a17',
  surfaceContainer: '#261e1b',
  surfaceContainerHigh: '#312825',
  surfaceContainerHighest: '#3c332f',
  outline: '#a28c84',
  outlineVariant: '#55433b',
  error: '#ffb4a5',
};

const android: typeof web = {
  bg: m3.surface,
  surface: m3.surfaceContainerLow,
  surfaceRaised: m3.surfaceContainerHigh,
  border: m3.outlineVariant,
  text: m3.onSurface,
  textMuted: m3.onSurfaceVariant,
  textFaint: m3.outline,
  accent: m3.primary,
  onAccent: m3.onPrimary,
  accentDim: '#ffb59833',
  danger: m3.error,
  bar: m3.surfaceContainer,
};

/** iOS dark system colours (grouped backgrounds, labels, separators) with Paadal's orange as the tint. */
const ios: typeof web = {
  bg: '#000000',
  surface: '#1C1C1E',
  surfaceRaised: '#2C2C2E',
  border: '#38383A',
  text: '#FFFFFF',
  textMuted: '#AEAEB2',
  textFaint: '#8D8D93',
  accent: '#FF7A45',
  onAccent: '#111111',
  accentDim: '#FF7A4533',
  danger: '#FF453A',
  bar: 'rgba(22,22,24,0.86)',
};

export const colors = HIG ? ios : M3 ? android : web;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** M3 shape scale (small 8, medium 12, large 16) on Android; Paadal's own radii elsewhere. */
export const radius = M3 ? { sm: 8, md: 12, lg: 16, pill: 999 } : { sm: 6, md: 10, lg: 16, pill: 999 };

/**
 * A tab's screen title: HIG large title (34 pt bold) on iOS, M3 headline medium (28/400) on Android,
 * Paadal's heavy 28 on the web.
 */
export const screenTitle: TextStyle = HIG
  ? { fontSize: 34, fontWeight: '700', letterSpacing: 0.4 }
  : M3
    ? { fontSize: 28, fontWeight: '400', letterSpacing: 0 }
    : { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 };

/** Section heading over a shelf: HIG title 2 (22 bold), M3 title large (22/400). */
export const sectionTitle: TextStyle = HIG
  ? { fontSize: 22, fontWeight: '700', letterSpacing: 0.35 }
  : M3
    ? { fontSize: 22, fontWeight: '400', letterSpacing: 0 }
    : { fontSize: 21, fontWeight: '800', letterSpacing: -0.4 };

/** Height of the floating mini player, used to pad scrollable content. */
export const MINI_PLAYER_HEIGHT = 64;
/** M3 navigation bar is 80 dp; the iOS tab bar is 49 pt plus room for the label baseline. */
export const TAB_BAR_HEIGHT = M3 ? 80 : HIG ? 52 : 58;
