import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Screen, IconButton } from '@/components/ui';
import { radii, spacing, typography } from '@/constants/tokens';
import { useColors } from '@/hooks/useColors';

export default function QiblaScreen() {
  const colors = useColors();
  const router = useRouter();
  return (
    <Screen scroll={false} contentStyle={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-right" label="العودة" onPress={() => router.back()} variant="soft" />
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>اتجاه القبلة</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>الرباط، المغرب</Text>
        </View>
      </View>
      <View style={styles.compassArea}>
        <View style={[styles.compassOuter, { borderColor: colors.border }]}>
          <View style={[styles.compassInner, { backgroundColor: colors.accent, borderColor: colors.primarySoft }]}>
            <View style={[styles.needle, { backgroundColor: colors.primary }]} />
            <View style={[styles.needlePoint, { borderBottomColor: colors.primary }]} />
            <View style={[styles.kaaba, { backgroundColor: colors.foreground }]}>
              <View style={[styles.kaabaBand, { backgroundColor: colors.accent }]} />
            </View>
            <Text style={[styles.north, { color: colors.mutedForeground }]}>ش</Text>
          </View>
        </View>
        <Text style={[styles.heading, { color: colors.foreground }]}>اتجاه القبلة</Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>حرّك الهاتف على شكل رقم ٨ للمعايرة</Text>
      </View>
      <View style={[styles.notice, { backgroundColor: colors.secondary }]}>
        <Feather name="info" size={17} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>سيتم استخدام مستشعر الاتجاه والموقع على جهازك لتحديد القبلة بدقة.</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="معايرة البوصلة" style={({ pressed }) => [styles.calibrate, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}>
        <Text style={[styles.calibrateText, { color: colors.primaryForeground }]}>معايرة البوصلة</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between' },
  header: { alignItems: 'center', flexDirection: 'row-reverse', gap: spacing.md },
  headerCopy: { alignItems: 'flex-end', flex: 1 },
  title: { fontSize: typography.h1, fontWeight: '700' },
  meta: { fontSize: typography.bodySmall, marginTop: 5 },
  compassArea: { alignItems: 'center', justifyContent: 'center' },
  compassOuter: { alignItems: 'center', borderRadius: 180, borderWidth: 1, height: 300, justifyContent: 'center', width: 300 },
  compassInner: { alignItems: 'center', borderRadius: 150, borderWidth: 1, height: 258, justifyContent: 'center', overflow: 'hidden', width: 258 },
  needle: { height: 92, position: 'absolute', transform: [{ rotate: '38deg' }], width: 2 },
  needlePoint: { borderBottomWidth: 42, borderLeftColor: 'transparent', borderLeftWidth: 9, borderRightColor: 'transparent', borderRightWidth: 9, position: 'absolute', top: 60, transform: [{ rotate: '38deg' }] },
  kaaba: { alignItems: 'center', borderRadius: 4, height: 32, justifyContent: 'center', transform: [{ rotate: '38deg' }], width: 32 },
  kaabaBand: { height: 4, width: 32 },
  north: { fontSize: typography.bodySmall, fontWeight: '700', position: 'absolute', top: 18 },
  heading: { fontSize: typography.h2, fontWeight: '700', marginTop: spacing.xl },
  helper: { fontSize: typography.bodySmall, marginTop: 5 },
  notice: { alignItems: 'center', borderRadius: radii.sm, flexDirection: 'row-reverse', gap: spacing.sm, padding: spacing.md },
  noticeText: { flex: 1, fontSize: typography.bodySmall, lineHeight: 20, textAlign: 'right' },
  calibrate: { alignItems: 'center', borderRadius: radii.pill, paddingVertical: 15 },
  calibrateText: { fontSize: typography.body, fontWeight: '700' },
});