import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  fetchQuranChapters,
  fetchQuranSurah,
  useGetQuranSurahs,
} from '@/lib/api';
import {
  downloadQuran,
  getOfflineQuranState,
  isQuranDownloaded,
  type DownloadProgress,
} from '@/lib/offline/quranDb';
import { ErrorState, IconButton, Screen } from '@/components/ui';
import { radii, spacing, typography } from '@/constants/tokens';
import { useColors } from '@/hooks/useColors';

/**
 * تنزيل القرآن كاملًا للاستخدام بدون إنترنت (SQLite). الاختصار من
 * "إعدادات القراءة" في تبويب القرآن. التنزيل قابل للاستئناف عمليًا لأن كل
 * سورة تُخزَّن فور وصولها، وفشله لا يمنع استخدام التطبيق أبدًا.
 */
export default function QuranDownloadScreen() {
  const colors = useColors();
  const router = useRouter();
  const surahsQuery = useGetQuranSurahs();
  const [state, setState] = useState(() => getOfflineQuranState());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  const start = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await downloadQuran(
        (surahId) => fetchQuranSurah(surahId),
        async () => surahsQuery.data ?? (await fetchQuranChapters()),
        (value) => setProgress(value),
      );
      setState(getOfflineQuranState());
      void result;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر تنزيل القرآن');
    } finally {
      setBusy(false);
      running.current = false;
    }
  };

  const downloaded = isQuranDownloaded();
  const percent =
    progress && progress.phase === 'surahs'
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="arrow-right" label="العودة" onPress={() => router.back()} variant="soft" />
        <Text style={[styles.title, { color: colors.foreground }]}>القرآن بدون إنترنت</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name={downloaded ? 'check-circle' : 'download'} size={26} color={colors.primary} />
        </View>
        {downloaded ? (
          <>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              تم تنزيل القرآن للاستخدام بدون إنترنت
            </Text>
            <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
              {state.ayahCount} آية محفوظة على جهازك — القراءة والأجزاء تعمل دون اتصال.
            </Text>
          </>
        ) : busy ? (
          <>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>جارٍ تحميل القرآن...</Text>
            <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
              السور {progress?.done ?? 0} من {progress?.total ?? 114}
            </Text>
            <View style={[styles.track, { backgroundColor: colors.muted }]}>
              <View style={[styles.fill, { backgroundColor: colors.primary, width: `${Math.max(percent, 2)}%` }]} />
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              حمّل المصحف كاملًا (نحو ٢ ميغابايت)
            </Text>
            <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
              يُخزَّن محليًا على جهازك فتعمل القراءة والأجزاء بدون إنترنت. التفسير يُحفظ تلقائيًا مع كل آية تفتحها.
            </Text>
            {error ? (
              <Text style={[styles.errorText, { color: '#B74C43' }]}>{error}</Text>
            ) : null}
          </>
        )}
      </View>

      {!downloaded && !busy ? (
        <View style={styles.actions}>
          <IconButton
            icon="download"
            label="بدء التنزيل"
            onPress={() => void start()}
            variant="dark"
          />
          <Text style={[styles.actionLabel, { color: colors.primary }]}>بدء التنزيل</Text>
        </View>
      ) : null}
      {busy ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          يمكنك مغادرة الصفحة — سيُستأنف التخزين من حيث توقف عند المحاولة القادمة.
        </Text>
      ) : null}
      {error && !busy ? (
        <ErrorState onRetry={() => void start()} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row-reverse', gap: spacing.md, marginBottom: spacing.xl },
  title: { flex: 1, fontSize: typography.h1, fontWeight: '700', textAlign: 'right' },
  card: { alignItems: 'center', borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.xl },
  iconWrap: { alignItems: 'center', borderRadius: radii.pill, height: 64, justifyContent: 'center', width: 64 },
  cardTitle: { fontSize: typography.h3, fontWeight: '700', textAlign: 'center' },
  cardMeta: { fontSize: typography.bodySmall, lineHeight: 22, textAlign: 'center' },
  track: { borderRadius: radii.pill, height: 8, marginTop: spacing.sm, overflow: 'hidden', width: '100%' },
  fill: { borderRadius: radii.pill, height: '100%' },
  errorText: { fontSize: typography.bodySmall, textAlign: 'center' },
  actions: { alignItems: 'center', flexDirection: 'row-reverse', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.xl },
  actionLabel: { fontSize: typography.body, fontWeight: '700' },
  hint: { fontSize: typography.caption, marginTop: spacing.lg, textAlign: 'center' },
});
