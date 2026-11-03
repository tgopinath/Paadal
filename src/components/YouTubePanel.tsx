import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Notice } from '@/components/Notice';
import { QuickPicks, SearchField } from '@/components/SearchField';
import { SectionTitle } from '@/components/Shelf';
import { FILM_SONG_QUICK_PICKS, YOUTUBE_API_KEY } from '@/config';
import { lookupVideo, parseYouTubeId, searchVideos, YouTubeSearchError, type YTVideo } from '@/services/youtube';
import { useYouTube } from '@/store/youtube';
import { colors, radius, spacing } from '@/theme';

export const YOUTUBE_RED = '#FF0033';

function VideoRow({ video, onPress }: { video: YTVideo; onPress: () => void }) {
  const saved = useYouTube((s) => s.saved.some((v) => v.id === video.id));
  const toggleSaved = useYouTube((s) => s.toggleSaved);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${video.title}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      <Image source={{ uri: video.thumbnail }} style={styles.thumb} accessibilityIgnoresInvertColors />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={styles.title}>{video.title}</Text>
        <Text numberOfLines={1} style={styles.channel}>{video.channel}</Text>
      </View>
      <IconButton
        name={saved ? 'heart' : 'heart-outline'}
        color={saved ? colors.accent : colors.textMuted}
        size={22}
        label={saved ? `Remove ${video.title} from saved` : `Save ${video.title}`}
        onPress={() => toggleSaved(video)}
      />
    </Pressable>
  );
}

export function YouTubePanel() {
  const saved = useYouTube((s) => s.saved);
  const playVideos = useYouTube((s) => s.playVideos);
  const toggleSaved = useYouTube((s) => s.toggleSaved);

  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [results, setResults] = useState<YTVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const play = (videos: YTVideo[], index: number) => {
    playVideos(videos, index);
    router.push('/youtube-player');
  };

  const runSearch = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setQuery(text);
    setActiveQuery(text);
    setLoading(true);
    setError(null);
    try {
      setResults(await searchVideos(text));
    } catch (e) {
      setResults([]);
      setError(e instanceof YouTubeSearchError ? e.message : 'Couldn’t reach YouTube. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const addLink = async () => {
    const id = parseYouTubeId(link);
    if (!id) {
      setLinkError('That doesn’t look like a YouTube link.');
      return;
    }
    setLinkError(null);
    const video = await lookupVideo(id);
    if (!saved.some((v) => v.id === id)) toggleSaved(video);
    setLink('');
    play([video], 0);
  };

  return (
    <View>
      {YOUTUBE_API_KEY ? (
        <>
          <SearchField
            value={query}
            onChangeText={setQuery}
            onSubmit={runSearch}
            placeholder="Search film songs on YouTube"
            label="Search YouTube"
          />
          <QuickPicks picks={FILM_SONG_QUICK_PICKS} onPick={runSearch} active={activeQuery} />
        </>
      ) : (
        <Notice title="YouTube search isn’t set up yet">
          Paste a YouTube link below to play it. To search from inside Paadal, add a YouTube API key (see the README).
        </Notice>
      )}

      <View style={styles.linkRow}>
        <TextInput
          value={link}
          onChangeText={(t) => {
            setLink(t);
            setLinkError(null);
          }}
          onSubmitEditing={addLink}
          placeholder="Paste a YouTube link"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.linkInput}
          accessibilityLabel="YouTube link"
        />
        <Pressable onPress={addLink} disabled={!link.trim()} accessibilityRole="button" style={[styles.linkButton, !link.trim() && { opacity: 0.4 }]}>
          <Text style={styles.linkButtonText}>Play</Text>
        </Pressable>
      </View>
      {linkError ? <Text style={styles.inlineError}>{linkError}</Text> : null}

      {error ? <Notice tone="error">{error}</Notice> : null}
      {loading ? <ActivityIndicator color={colors.text} style={{ marginVertical: spacing.xl }} /> : null}

      {!loading && results.length > 0 && (
        <View style={styles.section}>
          <SectionTitle>Results for “{activeQuery}”</SectionTitle>
          {results.map((v, i) => (
            <VideoRow key={v.id} video={v} onPress={() => play(results, i)} />
          ))}
        </View>
      )}

      {saved.length > 0 && (
        <View style={styles.section}>
          <SectionTitle>Saved videos</SectionTitle>
          {saved.map((v, i) => (
            <VideoRow key={v.id} video={v} onPress={() => play(saved, i)} />
          ))}
        </View>
      )}

      <Notice>
        {`YouTube videos play inside Paadal with the video showing, and stop when the screen locks (YouTube’s rule for other apps). ${
          Platform.OS === 'web' ? '' : 'With YouTube Premium, tap “Open in YouTube” on the player to keep listening with the screen locked. '
        }For lock-screen listening inside Paadal, use the Spotify tab.`}
      </Notice>
      <View style={styles.brand}>
        <FontAwesome name="youtube-play" size={16} color={YOUTUBE_RED} />
        <Text style={styles.brandText}>Videos from YouTube</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  thumb: { width: 112, height: 63, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  title: { color: colors.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  channel: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  linkRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm },
  linkInput: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 14,
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
  },
  linkButton: { height: 42, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.text, justifyContent: 'center' },
  linkButtonText: { color: '#111', fontWeight: '700' },
  inlineError: { color: colors.danger, fontSize: 13, marginHorizontal: spacing.lg, marginTop: spacing.xs },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.lg },
  brandText: { color: colors.textFaint, fontSize: 12 },
});
