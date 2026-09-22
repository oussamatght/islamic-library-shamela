import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Screen, IconButton, SectionTitle } from '@/components/ui';
import { radii, spacing, typography } from '@/constants/tokens';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="arrow-right" label="العودة" onPress={() => router.back()} variant="soft" />
        <Text style={[styles.title, { color: colors.foreground }]}>الإعدادات</Text>
      </View>
      <SectionTitle title="المظهر" />
      <View style={[styles.themeRow, { borderColor: colors.border }]}>
        {['فاتح', 'داكن', 'تلقائي'].map((theme, index) => (
          <Pressable key={theme} accessibilityRole="radio" accessibilityState={{ selected: index === 0 }} style={[styles.themeOption, index === 0 && { backgroundColor: colors.primary }]}>
            <Text style={[styles.themeText, { color: index === 0 ? colors.primaryForeground : colors.mutedForeground }]}>{theme}</Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle title="القراءة" />
      <View style={[styles.settingsGroup, { borderColor: colors.border }]}>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>حجم النص</Text>
            <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>متوسط</Text>
          </View>
          <Feather name="type" size={18} color={colors.primary} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>إظهار التفسير</Text>
            <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>عند الطلب</Text>
          </View>
          <Switch value={false} onValueChange={() => {}} trackColor={{ false: colors.muted, true: colors.primarySoft }} thumbColor={colors.card} />
        </View>
      </View>
      <SectionTitle title="الصوت والإشعارات" />
      <View style={[styles.settingsGroup, { borderColor: colors.border }]}>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>القارئ الافتراضي</Text>
            <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>مشاري العفاسي</Text>
          </View>
          <Feather name="volume-2" size={18} color={colors.primary} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>تنبيهات الصلاة</Text>
            <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>مفعلة</Text>
          </View>
          <Switch value onValueChange={() => {}} trackColor={{ false: colors.muted, true: colors.primarySoft }} thumbColor={colors.primary} />
        </View>
      </View>
      <Text style={[styles.privacy, { color: colors.mutedForeground }]}>بياناتك ووردك محفوظة على جهازك فقط.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { flex: 1, fontSize: typography.h1, fontWeight: '700', textAlign: 'right' },
  themeRow: { borderRadius: radii.sm, borderWidth: 1, flexDirection: 'row-reverse', padding: 4 },
  themeOption: { alignItems: 'center', borderRadius: 9, flex: 1, paddingVertical: 10 },
  themeText: { fontSize: typography.bodySmall, fontWeight: '600' },
  settingsGroup: { borderRadius: radii.md, borderWidth: 1, overflow: 'hidden' },
  row: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row-reverse', justifyContent: 'space-between', minHeight: 66, paddingHorizontal: spacing.md },
  rowCopy: { alignItems: 'flex-end' },
  rowTitle: { fontSize: typography.body, fontWeight: '600' },
  rowMeta: { fontSize: typography.caption, marginTop: 3 },
  privacy: { fontSize: typography.caption, marginTop: spacing.xl, textAlign: 'center' },
});