import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  getGetQuranAudioQueryKey,
  getGetQuranReaderQueryKey,
  getGetQuranTafsirQueryKey,
  useGetQuranAudio,
  useGetQuranReader,
  useGetQuranTafsir,
} from '@workspace/api-client-react';
import {
  ErrorState,
  IconButton,
  isOfflineError,
  LoadingState,
  Screen,
} from '@/components/ui';
import { radii, spacing, typography } from '@/constants/tokens';
import { useColors } from '@/hooks/useColors';

export default function QuranReader() {
  const colors = useColors();
  const router = useRouter();
  const { surah, surahId } = useLocalSearchParams<{ surah?: string; surahId?: string }>();
  const id = Number(surahId);
  const validId = Number.isInteger(id) && id >= 1 && id <= 114;
  const readerQuery = useGetQuranReader(validId ? id : 0, {
    query: { enabled: validId, queryKey: getGetQuranReaderQueryKey(validId ? id : 0) },
  });
  const audioQuery = useGetQuranAudio(validId ? id : 0, {
    query: { enabled: validId, queryKey: getGetQuranAudioQueryKey(validId ? id : 0) },
  });
  const tafsirQuery = useGetQuranTafsir(validId ? id : 0, 1, {
    query: { enabled: validId, queryKey: getGetQuranTafsirQueryKey(validId ? id : 0, 1) },
  });

  if (!validId) {
    return (
      <Screen>
        <IconButton icon="arrow-right" label="العودة" onPress={() => router.back()} variant="soft" />
        <ErrorState />
      </Screen>
    );
  }

  if (readerQuery.isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (readerQuery.isError || !readerQuery.data) {
    return (
      <Screen>
        <ErrorState offline={isOfflineError(readerQuery.error)} onRetry={() => void readerQuery.refetch()} />
      </Screen>
    );
  }

  const { surah: surahData, verses } = readerQuery.data;
  const firstVerse = verses[0];
  const audioLabel = audioQuery.isPending
    ? 'جارٍ تجهيز الصوت'
    : audioQuery.isError
      ? 'تعذر تحميل الصوت'
      : 'استماع للسورة';

  return (
    <Screen>
      <View style={styles.readerHeader}>
        <IconButton icon="arrow-right" label="العودة" onPress={() => router.back()} variant="soft" />
        <View style={styles.readerTitle}>
          <Text style={[styles.surahTitle, { color: colors.foreground }]}>
            {surahData.nameArabic || surah || 'القرآن الكريم'}
          </Text>
          <Text style={[styles.readerMeta, { color: colors.mutedForeground }]}>
            {firstVerse ? `الجزء ${firstVerse.juz} • الصفحة ${firstVerse.page}` : 'قراءة مباشرة'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={audioLabel}
          disabled={!audioQuery.data}
          onPress={() => {
            if (audioQuery.data?.audioUrl) void Linking.openURL(audioQuery.data.audioUrl);
          }}
          style={({ pressed }) => [
            styles.audioButton,
            {
              backgroundColor: colors.secondary,
              opacity: pressed || !audioQuery.data ? 0.45 : 1,
            },
          ]}
        >
          <Feather name="headphones" size={18} color={colors.primary} />
          <Text style={[styles.audioText, { color: colors.primary }]}>استماع</Text>
        </Pressable>
      </View>
      {audioQuery.isPending ? (
        <Text style={[styles.statusText, { color: colors.mutedForeground }]}>جارٍ تحميل الصوت...</Text>
      ) : null}
      {audioQuery.isError ? (
        <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
          تعذر تحميل الصوت، يمكنك متابعة القراءة دون اتصال صوتي.
        </Text>
      ) : null}
      <View style={[styles.bismillah, { borderColor: colors.border }]}>
        <Text style={[styles.bismillahText, { color: colors.primary }]}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
      </View>
      {verses.length === 0 ? (
        <Text style={[styles.statusText, { color: colors.mutedForeground }]}>لا توجد آيات متاحة لهذه السورة.</Text>
      ) : (
        verses.map((ayah) => (
          <Pressable
            key={ayah.id}
            testID={`ayah-${ayah.verseNumber}`}
            accessibilityRole="button"
            accessibilityLabel={`الآية ${ayah.verseNumber}`}
            style={({ pressed }) => [
              styles.ayah,
              { borderBottomColor: colors.border, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <View style={[styles.ayahNumber, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.ayahNumberText, { color: colors.primary }]}>{ayah.verseNumber}</Text>
            </View>
            <Text style={[styles.ayahText, { color: colors.foreground }]}>{ayah.text}</Text>
          </Pressable>
        ))
      )}
      <View style={[styles.tafsirCard, { backgroundColor: colors.accent }]}>
        <View style={styles.tafsirHeading}>
          <Feather name="book-open" size={16} color={colors.primary} />
          <Text style={[styles.tafsirTitle, { color: colors.foreground }]}>التفسير</Text>
        </View>
        {tafsirQuery.isPending ? <LoadingState /> : null}
        {tafsirQuery.isError ? (
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>تعذر تحميل التفسير الآن.</Text>
        ) : (
          <Text style={[styles.tafsirText, { color: colors.foreground }]}>
            {tafsirQuery.data?.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
              'لا يوجد تفسير متاح لهذه الآية.'}
          </Text>
        )}
      </View>
      <View style={[styles.readerNote, { backgroundColor: colors.accent }]}>
        <Feather name="bookmark" size={16} color={colors.primary} />
        <Text style={[styles.readerNoteText, { color: colors.foreground }]}>
          اضغط على أي آية لحفظ موضع القراءة في جهازك
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  readerHeader: { alignItems: 'center', flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: spacing.lg },
  readerTitle: { alignItems: 'center', flex: 1 },
  surahTitle: { fontSize: typography.h2, fontWeight: '700' },
  readerMeta: { fontSize: typography.caption, marginTop: 4 },
  audioButton: { alignItems: 'center', borderRadius: radii.pill, flexDirection: 'row-reverse', gap: 5, paddingHorizontal: 10, paddingVertical: 9 },
  audioText: { fontSize: typography.caption, fontWeight: '700' },
  statusText: { fontSize: typography.bodySmall, lineHeight: 22, marginBottom: spacing.md, textAlign: 'right' },
  bismillah: { alignItems: 'center', borderBottomWidth: 1, borderTopWidth: 1, paddingVertical: spacing.lg },
  bismillahText: { fontSize: typography.quranMedium, textAlign: 'center' },
  ayah: { alignItems: 'flex-start', borderBottomWidth: 1, flexDirection: 'row-reverse', gap: spacing.sm, paddingVertical: spacing.lg },
  ayahNumber: { alignItems: 'center', borderRadius: radii.pill, height: 28, justifyContent: 'center', marginTop: 5, width: 28 },
  ayahNumberText: { fontSize: typography.caption, fontWeight: '700' },
  ayahText: { flex: 1, fontSize: typography.quranLarge, lineHeight: 50, textAlign: 'right' },
  tafsirCard: { borderRadius: radii.sm, marginTop: spacing.lg, padding: spacing.md },
  tafsirHeading: { alignItems: 'center', flexDirection: 'row-reverse', gap: spacing.xs },
  tafsirTitle: { fontSize: typography.body, fontWeight: '700' },
  tafsirText: { fontSize: typography.bodySmall, lineHeight: 24, marginTop: spacing.sm, textAlign: 'right' },
  readerNote: { alignItems: 'center', borderRadius: radii.sm, flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md },
  readerNoteText: { flex: 1, fontSize: typography.bodySmall, lineHeight: 21, textAlign: 'right' },
});