import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetQuranSurahs } from '@workspace/api-client-react';
import { AppHeader, ErrorState, isOfflineError, LoadingState, SearchBar, Screen } from '@/components/ui';
import { radii, spacing, typography } from '@/constants/tokens';
import { useColors } from '@/hooks/useColors';

export default function QuranScreen() {
  const colors = useColors();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const surahsQuery = useGetQuranSurahs();
  const surahs = surahsQuery.data?.data ?? [];
  const filtered = useMemo(
    () =>
      surahs.filter((surah) =>
        `${surah.nameArabic} ${surah.nameEnglish}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, surahs],
  );

  if (surahsQuery.isPending) {
    return (
      <Screen>
        <AppHeader eyebrow="وردك اليومي" title="القرآن الكريم" />
        <LoadingState />
      </Screen>
    );
  }

  if (surahsQuery.isError) {
    return (
      <Screen>
        <AppHeader eyebrow="وردك اليومي" title="القرآن الكريم" />
        <ErrorState offline={isOfflineError(surahsQuery.error)} onRetry={() => void surahsQuery.refetch()} />
      </Screen>
    );
  }

  if (surahs.length === 0) {
    return (
      <Screen>
        <AppHeader eyebrow="وردك اليومي" title="القرآن الكريم" />
        <View style={styles.empty}>
          <Feather name="book-open" size={22} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد سور متاحة الآن</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <AppHeader
        eyebrow="وردك اليومي"
        title="القرآن الكريم"
        action="settings"
        actionLabel="إعدادات القراءة"
        onAction={() => router.push('/settings')}
      />
      <SearchBar placeholder="ابحث في القرآن..." value={query} onChangeText={setQuery} />
      <View style={styles.tabs}>
        {['السور', 'الأجزاء', 'الصفحات'].map((tab, index) => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: index === 0 }}
            style={[styles.tab, index === 0 && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.tabText, { color: index === 0 ? colors.primaryForeground : colors.mutedForeground }]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.listCount, { color: colors.mutedForeground }]}>{surahs.length} سورة</Text>
            <Text style={[styles.listHint, { color: colors.mutedForeground }]}>بسم الله الرحمن الرحيم</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد نتائج</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`surah-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`فتح سورة ${item.nameArabic}`}
            onPress={() =>
              router.push({
                pathname: '/quran-reader',
                params: { surahId: String(item.id), surah: item.nameArabic },
              })
            }
            style={({ pressed }) => [
              styles.surahRow,
              { borderBottomColor: colors.border, opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <View style={[styles.number, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.numberText, { color: colors.primary }]}>{String(item.id).padStart(2, '0')}</Text>
            </View>
            <View style={styles.surahCopy}>
              <Text style={[styles.surahName, { color: colors.foreground }]}>{item.nameArabic}</Text>
              <Text style={[styles.surahMeta, { color: colors.mutedForeground }]}>
                {item.revelationPlace} • {item.versesCount} آية
              </Text>
            </View>
            <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { backgroundColor: 'transparent', flexDirection: 'row-reverse', gap: 8, marginTop: spacing.lg },
  tab: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 8 },
  tabText: { fontSize: typography.bodySmall, fontWeight: '700' },
  list: { paddingBottom: 110 },
  listHeader: { alignItems: 'center', flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: spacing.lg },
  listCount: { fontSize: typography.caption },
  listHint: { fontSize: typography.bodySmall, textAlign: 'right' },
  surahRow: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row-reverse', gap: spacing.sm, minHeight: 78 },
  number: { alignItems: 'center', borderRadius: radii.sm, height: 36, justifyContent: 'center', width: 36 },
  numberText: { fontSize: typography.bodySmall, fontWeight: '700' },
  surahCopy: { alignItems: 'flex-end', flex: 1 },
  surahName: { fontSize: typography.bodyLarge, fontWeight: '700' },
  surahMeta: { fontSize: typography.caption, marginTop: 4 },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xxl },
  emptyText: { fontSize: typography.bodySmall, textAlign: 'center' },
});