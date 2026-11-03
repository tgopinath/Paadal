import { useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { formatTime } from '@/lib/format';
import { colors } from '@/theme';

type Props = { position: number; duration: number; onSeek: (seconds: number) => void };

/** Draggable progress bar. Built on the responder system so it works on iOS, Android and web. */
export function SeekBar({ position, duration, onSeek }: Props) {
  const [width, setWidth] = useState(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const hasDuration = duration > 0;
  const ratio = dragRatio ?? (hasDuration ? Math.min(1, position / duration) : 0);

  const ratioFrom = (e: GestureResponderEvent) =>
    width > 0 ? Math.min(1, Math.max(0, e.nativeEvent.locationX / width)) : 0;

  return (
    <View>
      <View
        style={styles.touch}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => hasDuration}
        onMoveShouldSetResponder={() => hasDuration}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => setDragRatio(ratioFrom(e))}
        onResponderMove={(e) => setDragRatio(ratioFrom(e))}
        onResponderRelease={(e) => {
          onSeek(ratioFrom(e) * duration);
          setDragRatio(null);
        }}
        onResponderTerminate={() => setDragRatio(null)}
        accessibilityRole="adjustable"
        accessibilityLabel="Seek"
        accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(position), text: formatTime(position) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const delta = e.nativeEvent.actionName === 'increment' ? 10 : -10;
          onSeek(Math.min(duration, Math.max(0, position + delta)));
        }}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
        <View pointerEvents="none" style={[styles.thumb, { left: `${ratio * 100}%` }, dragRatio !== null && styles.thumbActive]} />
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{formatTime(dragRatio !== null ? dragRatio * duration : position)}</Text>
        <Text style={styles.time}>{hasDuration ? formatTime(duration) : '--:--'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  touch: { height: 28, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.text },
  thumb: { position: 'absolute', width: 14, height: 14, borderRadius: 7, marginLeft: -7, backgroundColor: colors.text, top: 7 },
  thumbActive: { width: 20, height: 20, borderRadius: 10, marginLeft: -10, top: 4 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  time: { color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
});
