import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useGetAdhkar } from '@/lib/api';
import { ErrorState, IconButton, isOfflineError, LoadingState, Screen } from '@/components/ui';
import { radii, spacing, typography } from '@/constants/tokens';
import { useColors } from '@/hooks/useColors';

export default function AdhkarCounter() {
  const colors = useColors();
  const router = useRouter();
  const { title, categoryId } = useLocalSearchParams<{ title?: string; categoryId?: string }>();
  const query = useGetAdhkar({ categoryId });
  const [count, setCount] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const categories = query.data ?? [];
  const category = categories.find((candidate) => candidate.title === title) ?? categories[0];
  const items = category?.items ?? [];
  const item = items[itemIndex] ?? items[0];
  const target = Math.max(item?.repeatCount ?? 1, 1);

  if (query.isPending) {
    return <Screen><LoadingState /></Screen>;
  }

  if (query.isError) {
    return <Screen><ErrorState offline={isOfflineError(query.error)} onRetry={() => void query.refetch()} /></Screen>;
  }

  if (!item) {
    return <Screen><ErrorState onRetry={() => void query.refetch()} /></Screen>;
  }

  const handleCount = () => {
    if (count < target) {
      setCount((value) => value + 1);
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const navigateTo = (direction: 'prev' | 'next') => {
    if (items.length === 0) return;
    setItemIndex((index) => {
      if (direction === 'next') return (index + 1) % items.length;
      return (index - 1 + items.length) % items.length;
    });
    setCount(0);
  };

  return (
    <Screen scroll={false} contentStyle={styles.container}>
      <View style={styles.top}>
        <IconButton icon="arrow-right" label="العودة" onPress={() => router.back()} variant="soft" />
        <View style={styles.topCopy}>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>{title ?? item.title}</Text>
          <Text style={[styles.topMeta, { color: colors.mutedForeground }]}>وردك الآن</Text>
        </View>
        <IconButton icon="rotate-ccw" label="إعادة العداد" onPress={() => setCount(0)} variant="soft" />
      </View>
      <View style={styles.focus}>
        <Text style={[styles.dhikr, { color: colors.foreground }]}>{item.arabicText}</Text>
        {item.translation ? (
          <Text style={[styles.translation, { color: colors.mutedForeground }]}>{item.translation}</Text>
        ) : null}
        <Text style={[styles.source, { color: colors.mutedForeground }]}>{item.title}</Text>
        <Pressable
          testID="dhikr-counter"
          accessibilityRole="button"
          accessibilityLabel={`${item.title}، ${count} من ${target}`}
          accessibilityHint="اضغط للزيادة"
          onPress={handleCount}
          style={({ pressed }) => [
            styles.counter,
            { borderColor: colors.primary, backgroundColor: pressed ? colors.secondary : colors.card },
          ]}
        >
          <Text style={[styles.count, { color: colors.primary }]}>{count}</Text>
          <Text style={[styles.target, { color: colors.mutedForeground }]}>من {target}</Text>
          <View style={[styles.counterProgress, { backgroundColor: colors.muted }]}>
            <View style={[styles.counterProgressFill, { backgroundColor: colors.primary, width: `${(count / target) * 100}%` }]} />
          </View>
        </Pressable>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>اضغط برفق للعد</Text>
      </View>
      <View style={styles.bottomActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الذكر السابق"
          onPress={() => navigateTo('prev')}
          style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}
        >
          <Feather name="chevron-right" size={17} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.foreground }]}>السابق</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الذكر التالي"
          onPress={() => navigateTo('next')}
          style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}
        >
          <Text style={[styles.actionText, { color: colors.foreground }]}>التالي</Text>
          <Feather name="chevron-left" size={17} color={colors.primary} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between' },
  top: { alignItems: 'center', flexDirection: 'row-reverse', justifyContent: 'space-between' },
  topCopy: { alignItems: 'center', flex: 1 },
  topTitle: { fontSize: typography.h2, fontWeight: '700', textAlign: 'center' },
  topMeta: { fontSize: typography.caption, marginTop: 3 },
  focus: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  dhikr: { fontSize: 27, fontWeight: '600', lineHeight: 45, textAlign: 'center' },
  translation: { fontSize: typography.bodySmall, lineHeight: 22, marginTop: spacing.sm, textAlign: 'center' },
  source: { fontSize: typography.bodySmall, marginTop: spacing.sm },
  counter: { alignItems: 'center', borderRadius: 180, borderWidth: 2, height: 250, justifyContent: 'center', marginTop: spacing.xl, width: 250 },
  count: { fontSize: 64, fontWeight: '300' },
  target: { fontSize: typography.bodySmall, marginTop: -4 },
  counterProgress: { borderRadius: radii.pill, height: 5, marginTop: spacing.lg, overflow: 'hidden', width: 130 },
  counterProgressFill: { borderRadius: radii.pill, height: '100%' },
  helper: { fontSize: typography.caption, marginTop: spacing.md },
  bottomActions: { flexDirection: 'row-reverse', gap: spacing.sm, justifyContent: 'center' },
  secondaryAction: { alignItems: 'center', borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row-reverse', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 11 },
  actionText: { fontSize: typography.bodySmall, fontWeight: '600' },
});