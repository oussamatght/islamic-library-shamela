import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetAdhkar, useGetDuas } from '@workspace/api-client-react';
import {
  EmptyState,
  ErrorState,
  isOfflineError,
  LoadingState,
  AppHeader,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { radii, spacing, typography } from '@/constants/tokens';
import { useColors } from '@/hooks/useColors';

export default function AdhkarScreen() {
  const colors = useColors();
  const router = useRouter();
  const adhkarQuery = useGetAdhkar({ categoryId: 1 });
  const duasQuery = useGetDuas({ categoryId: 6 });
  const categories = adhkarQuery.data?.categories ?? [];
  const recommended = categories[0]?.items[0];
  const dua = duasQuery.data?.categories[0]?.items[0];

  if (adhkarQuery.isPending || duasQuery.isPending) {
    return (
      <Screen>
        <AppHeader eyebrow="لحظات من السكينة" title="الأذكار" />
        <LoadingState />
      </Screen>
    );
  }

  if (adhkarQuery.isError || duasQuery.isError) {
    const error = adhkarQuery.error ?? duasQuery.error;
    return (
      <Screen>
        <AppHeader eyebrow="لحظات من السكينة" title="الأذكار" />
        <ErrorState offline={isOfflineError(error)} onRetry={() => {
          void adhkarQuery.refetch();
          void duasQuery.refetch();
        }} />
      </Screen>
    );
  }

  if (categories.length === 0) {
    return (
      <Screen>
        <AppHeader eyebrow="لحظات من السكينة" title="الأذكار" />
        <EmptyState title="لا توجد أذكار متاحة" message="جرّب تحديث المحتوى بعد قليل." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader eyebrow="لحظات من السكينة" title="الأذكار" action="search" actionLabel="البحث في الأذكار" />
      <View style={[styles.intro, { backgroundColor: colors.accent }]}>
        <Feather name="wind" size={22} color={colors.primary} />
        <View style={styles.introCopy}>
          <Text style={[styles.introTitle, { color: colors.foreground }]}>اذكر الله تطمئن القلوب</Text>
          <Text style={[styles.introText, { color: colors.mutedForeground }]}>اختر وردًا من المحتوى المتصل</Text>
        </View>
      </View>
      <SectionTitle title="التصنيفات" />
      <View style={styles.grid}>
        {categories.map((category) => (
          <Pressable
            key={`${category.id}-${category.title}`}
            testID={`adhkar-${category.id}`}
            accessibilityRole="button"
            accessibilityLabel={`فتح ${category.title}`}
            onPress={() =>
              router.push({
                pathname: '/adhkar-counter',
                params: { title: category.title, categoryId: String(category.id) },
              })
            }
            style={({ pressed }) => [
              styles.category,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <View style={[styles.categoryIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="sun" size={19} color={colors.primary} />
            </View>
            <Text style={[styles.categoryTitle, { color: colors.foreground }]}>{category.title}</Text>
            <Text style={[styles.categoryCount, { color: colors.mutedForeground }]}>
              {category.items.length} ذكر
            </Text>
          </Pressable>
        ))}
      </View>
      {recommended ? (
        <>
          <SectionTitle title="ورد مقترح" action="ابدأ الآن" onAction={() => router.push({
            pathname: '/adhkar-counter',
            params: { title: recommended.title, categoryId: String(categories[0].id) },
          })} />
          <Pressable
            testID="recommended-dhikr"
            accessibilityRole="button"
            accessibilityLabel={`بدء ${recommended.title}`}
            onPress={() => router.push({
              pathname: '/adhkar-counter',
              params: { title: recommended.title, categoryId: String(categories[0].id) },
            })}
            style={({ pressed }) => [
              styles.recommendation,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.counterCircle, { borderColor: colors.primary }]}>
              <Text style={[styles.counterNumber, { color: colors.primary }]}>{recommended.repeat}</Text>
              <Text style={[styles.counterCaption, { color: colors.mutedForeground }]}>مرة</Text>
            </View>
            <View style={styles.recommendationCopy}>
              <Text style={[styles.recommendationTitle, { color: colors.foreground }]}>{recommended.title}</Text>
              <Text numberOfLines={2} style={[styles.recommendationMeta, { color: colors.mutedForeground }]}>
                {recommended.text}
              </Text>
            </View>
            <Feather name="chevron-left" size={19} color={colors.mutedForeground} />
          </Pressable>
        </>
      ) : null}
      {dua ? (
        <View style={[styles.duaCard, { backgroundColor: colors.secondary }]}>
          <View style={styles.duaHeading}>
            <Feather name="heart" size={16} color={colors.primary} />
            <Text style={[styles.duaTitle, { color: colors.foreground }]}>دعاء من الوِرد</Text>
          </View>
          <Text numberOfLines={4} style={[styles.duaText, { color: colors.foreground }]}>{dua.text}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: 'center', borderRadius: radii.md, flexDirection: 'row-reverse', gap: spacing.md, padding: spacing.md },
  introCopy: { alignItems: 'flex-end', flex: 1 },
  introTitle: { fontSize: typography.bodyLarge, fontWeight: '700' },
  introText: { fontSize: typography.bodySmall, marginTop: 4 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  category: { borderRadius: radii.md, borderWidth: 1, flexGrow: 1, minHeight: 132, padding: spacing.md, width: '47%' },
  categoryIcon: { alignItems: 'center', borderRadius: radii.pill, height: 38, justifyContent: 'center', width: 38 },
  categoryTitle: { fontSize: typography.body, fontWeight: '700', marginTop: spacing.md, textAlign: 'right' },
  categoryCount: { fontSize: typography.caption, marginTop: 4, textAlign: 'right' },
  recommendation: { alignItems: 'center', borderRadius: radii.md, borderWidth: 1, flexDirection: 'row-reverse', gap: spacing.sm, padding: spacing.md },
  counterCircle: { alignItems: 'center', borderRadius: radii.pill, borderWidth: 1, height: 54, justifyContent: 'center', width: 54 },
  counterNumber: { fontSize: typography.h3, fontWeight: '700' },
  counterCaption: { fontSize: 9, marginTop: -2 },
  recommendationCopy: { alignItems: 'flex-end', flex: 1 },
  recommendationTitle: { fontSize: typography.bodyLarge, fontWeight: '700', textAlign: 'right' },
  recommendationMeta: { fontSize: typography.caption, marginTop: 3, textAlign: 'right' },
  duaCard: { borderRadius: radii.md, marginTop: spacing.lg, padding: spacing.md },
  duaHeading: { alignItems: 'center', flexDirection: 'row-reverse', gap: spacing.xs },
  duaTitle: { fontSize: typography.body, fontWeight: '700' },
  duaText: { fontSize: typography.body, lineHeight: 26, marginTop: spacing.sm, textAlign: 'right' },
});