import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useLibrary } from '@/store/library';
import { colors, radius, spacing } from '@/theme';

/** Create a playlist (optionally seeded with a song), or rename one via `renameId`. */
export default function CreatePlaylist() {
  const { trackId, renameId } = useLocalSearchParams<{ trackId?: string; renameId?: string }>();
  const existing = useLibrary((s) => s.userPlaylists.find((p) => p.id === renameId));
  const count = useLibrary((s) => s.userPlaylists.length);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const renamePlaylist = useLibrary((s) => s.renamePlaylist);
  const [name, setName] = useState(existing?.title ?? `My Playlist #${count + 1}`);

  const cancel = () => (router.canGoBack() ? router.back() : router.replace('/library'));
  const submit = () => {
    const title = name.trim();
    if (!title) return;
    if (existing) {
      renamePlaylist(existing.id, title);
      cancel();
      return;
    }
    const id = createPlaylist(title, trackId || undefined);
    router.replace({ pathname: '/playlist/[id]', params: { id } });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <Text style={styles.heading}>{existing ? 'Rename playlist' : 'Give your playlist a name'}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        selectTextOnFocus
        onSubmitEditing={submit}
        returnKeyType="done"
        maxLength={60}
        style={styles.input}
        accessibilityLabel="Playlist name"
      />
      <View style={styles.buttons}>
        <Pressable onPress={cancel} accessibilityRole="button" style={[styles.button, styles.secondary]}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
        <Pressable onPress={submit} disabled={!name.trim()} accessibilityRole="button" style={[styles.button, styles.primary, !name.trim() && { opacity: 0.4 }]}>
          <Text style={styles.primaryText}>{existing ? 'Save' : 'Create'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl },
  heading: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  input: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.textFaint,
    paddingVertical: spacing.md,
    marginVertical: spacing.xxl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  button: { borderRadius: radius.pill, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, minWidth: 120, alignItems: 'center' },
  primary: { backgroundColor: colors.accent },
  primaryText: { color: '#111', fontWeight: '800', fontSize: 15 },
  secondary: { borderWidth: 1, borderColor: colors.textFaint },
  secondaryText: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
