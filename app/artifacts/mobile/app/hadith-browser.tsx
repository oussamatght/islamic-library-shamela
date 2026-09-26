import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetBookHadiths, useGetHadithBooks } from '@/lib/api';
import {
  AppHeader,
  ErrorState,
  IconButton,
  isOfflineError,
  LoadingState,
  Screen,
} from '@/components/ui';
import { radii, spacing, typography } from '@/constants/tokens';
import { useColors } from '@/hooks/useColors';

/**
 * Hadith browser: pick one of the nine canonical books, then page through its
 * ahadith. Opened from the "more" tab with an optional ?book=slug.
 */
export default function HadithBrowser() {
  const colors = useColors();
  const router = useRouter();
  const { book } = useLocalSearchParams<{ book?: string }>();
  const booksQuery = useGetHadithBooks();
  const [selectedBook, setSelectedBook] = useState<string | null>(book ?? null);
  const [page, setPage] = useState(1);

  const listQuery = useGetBookHadiths(
    selectedBook ? { bookSlug: selectedBook, page, perPage: 10 } : null,
  );

  const books = booksQuery.data ?? [];
  const currentBook = books.find((candidate) => candidate.slug === selectedBook);

  if (!selectedBook) {
    return (
      <Screen>
        <View style={styles.header}>
          <IconButton icon="arrow-right" label="العودة" onPress={() => router.back()} variant="soft" />
          <Text style={[styles.title, { color: colors.foreground }]}>كتب الحديث</Text>
        </View>
        {booksQuery.isPending ? <LoadingState /> : null}
        {booksQuery.isError ? (
          <ErrorState
            offline={isOfflineError(booksQuery.error)}
            onRetry={() => void booksQuery.refetch()}
          />
        ) : (
          <FlatList
            data={books}
            keyExtractor={(item) => item.slug}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bookList}
            renderItem={({ item }) => (
              <Pressable
                testID={`book-${item.slug}`}
                accessibilityRole="button"
                accessibilityLabel={`فتح ${item.nameAr}`}
                onPress={() => {
                  setSelectedBook(item.slug);
                  setPage(1);
                }}
                style={({ pressed }) => [
                  styles.bookRow,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={[styles.bookIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="book-open" size={19} color={colors.primary} />
                </View>
                <View style={styles.bookCopy}>
                  <Text style={[styles.bookName, { color: colors.foreground }]}>{item.nameAr}</Text>
                  <Text style={[styles.bookMeta, { color: colors.mutedForeground }]}>{item.total} حديث</Text>
                </View>
                <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          />
        )}
      </Screen>
    );
  }

  const items = listQuery.data?.items ?? [];
  const hasMore = listQuery.data?.hasMore ?? false;

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-right"
          label="العودة إلى الكتب"
          onPress={() => {
            setSelectedBook(null);
            setPage(1);
          }}
          variant="soft"
        />
        <View style={styles.titleCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {currentBook?.nameAr ?? 'الأحاديث'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            الصفحة {listQuery.data?.page ?? page} من {listQuery.data ? Math.ceil(listQuery.data.total / listQuery.data.perPage) : '—'}
          </Text>
        </View>
      </View>

      {listQuery.isPending ? <LoadingState /> : null}
      {listQuery.isError ? (
        <ErrorState
          offline={isOfflineError(listQuery.error)}
          onRetry={() => void listQuery.refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.hadithList}
          renderItem={({ item }) => (
            <View style={[styles.hadithCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.hadithText, { color: colors.foreground }]}>{item.text}</Text>
              <View style={styles.hadithFooter}>
                <Feather name="bookmark" size={14} color={colors.primary} />
                <Text style={[styles.hadithSource, { color: colors.primary }]}>{item.source}</Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={styles.pager}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="الصفحة السابقة"
                disabled={page <= 1 || listQuery.isPending}
                onPress={() => setPage((value) => Math.max(value - 1, 1))}
                style={({ pressed }) => [
                  styles.pagerButton,
                  { backgroundColor: colors.secondary, opacity: page <= 1 ? 0.4 : pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="chevron-right" size={17} color={colors.primary} />
                <Text style={[styles.pagerText, { color: colors.primary }]}>السابق</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="الصفحة التالية"
                disabled={!hasMore || listQuery.isPending}
                onPress={() => setPage((value) => value + 1)}
                style={({ pressed }) => [
                  styles.pagerButton,
                  { backgroundColor: colors.secondary, opacity: !hasMore ? 0.4 : pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.pagerText, { color: colors.primary }]}>التالي</Text>
                <Feather name="chevron-left" size={17} color={colors.primary} />
              </Pressable>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row-reverse', gap: spacing.md, marginBottom: spacing.lg },
  titleCopy: { alignItems: 'flex-end', flex: 1 },
  title: { fontSize: typography.h1, fontWeight: '700', textAlign: 'right' },
  subtitle: { fontSize: typography.caption, marginTop: 2 },
  bookList: { paddingBottom: 40 },
  bookRow: { alignItems: 'center', borderRadius: radii.md, borderWidth: 1, flexDirection: 'row-reverse', gap: spacing.sm, marginBottom: spacing.sm, padding: spacing.md },
  bookIcon: { alignItems: 'center', borderRadius: radii.sm, height: 42, justifyContent: 'center', width: 42 },
  bookCopy: { alignItems: 'flex-end', flex: 1 },
  bookName: { fontSize: typography.body, fontWeight: '700', textAlign: 'right' },
  bookMeta: { fontSize: typography.caption, marginTop: 2 },
  hadithList: { paddingBottom: 40 },
  hadithCard: { borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.sm, padding: spacing.md },
  hadithText: { fontSize: typography.body, lineHeight: 28, textAlign: 'right' },
  hadithFooter: { alignItems: 'center', flexDirection: 'row-reverse', gap: 5, marginTop: spacing.sm },
  hadithSource: { fontSize: typography.caption, fontWeight: '600' },
  pager: { flexDirection: 'row-reverse', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.lg },
  pagerButton: { alignItems: 'center', borderRadius: radii.pill, flexDirection: 'row-reverse', gap: 5, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  pagerText: { fontSize: typography.bodySmall, fontWeight: '700' },
});
