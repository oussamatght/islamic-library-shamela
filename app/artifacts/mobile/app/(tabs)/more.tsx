import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetHadiths } from '@workspace/api-client-react';
import { AppHeader, ErrorState, isOfflineError, LoadingState, Screen, SectionTitle } from '@/components/ui';
import { radii, spacing, typography } from '@/constants/tokens';
import { useColors } from '@/hooks/useColors';

const links = [
  { title: 'مواقيت الصلاة', subtitle: 'تابع صلوات اليوم', icon: 'clock' as const, route: '/prayer' },
  { title: 'اتجاه القبلة', subtitle: 'اعرف اتجاه مكة', icon: 'compass' as const, route: '/qibla' },
  { title: 'المفضلة', subtitle: 'آيات وأحاديث محفوظة', icon: 'heart' as const, route: '/favorites' },
  { title: 'الإعدادات', subtitle: 'المظهر والقراءة والصوت', icon: 'sliders' as const, route: '/settings' },
];

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const hadithQuery = useGetHadiths({ categoryId: 2, page: 1, perPage: 1 });
  const hadith = hadithQuery.data?.data?.[0];
  return (
    <Screen>
      <AppHeader eyebrow="مساحتك الخاصة" title="المزيد" />
      <View style={[styles.profile, { backgroundColor: colors.primary }]}>
        <View style={styles.profileMark}>
          <Feather name="moon" size={24} color={colors.primary} />
        </View>
        <View style={styles.profileCopy}>
          <Text style={[styles.profileTitle, { color: colors.primaryForeground }]}>رفيقك اليومي</Text>
          <Text style={[styles.profileText, { color: colors.primarySoft }]}>كل ما تحتاجه في مكان هادئ</Text>
        </View>
      </View>
      <SectionTitle title="الوصول السريع" />
      <View style={styles.links}>
        {links.map((link) => (
          <Pressable
            key={link.title}
            testID={`more-${link.title}`}
            accessibilityRole="button"
            accessibilityLabel={`فتح ${link.title}`}
            onPress={() => router.push(link.route as never)}
            style={({ pressed }) => [styles.link, { borderBottomColor: colors.border, opacity: pressed ? 0.68 : 1 }]}
          >
            <View style={[styles.linkIcon, { backgroundColor: colors.secondary }]}>
              <Feather name={link.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.linkCopy}>
              <Text style={[styles.linkTitle, { color: colors.foreground }]}>{link.title}</Text>
              <Text style={[styles.linkSubtitle, { color: colors.mutedForeground }]}>{link.subtitle}</Text>
            </View>
            <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
      <SectionTitle title="حديث اليوم" />
      {hadithQuery.isPending ? <LoadingState /> : null}
      {hadithQuery.isError ? (
        <ErrorState offline={isOfflineError(hadithQuery.error)} onRetry={() => void hadithQuery.refetch()} />
      ) : hadith ? (
        <View style={[styles.hadithCard, { backgroundColor: colors.accent }]}>
          <Text style={[styles.hadithTitle, { color: colors.foreground }]}>{hadith.title}</Text>
          <Text style={[styles.hadithText, { color: colors.mutedForeground }]}>{hadith.text}</Text>
          <Text style={[styles.hadithSource, { color: colors.primary }]}>{hadith.source}</Text>
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد حديث متاح الآن.</Text>
      )}
      <Text style={[styles.version, { color: colors.mutedForeground }]}>Sakinah • إصدار تجريبي هادئ</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center', borderRadius: radii.lg, flexDirection: 'row-reverse', gap: spacing.md, padding: spacing.lg },
  profileMark: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: radii.pill, height: 54, justifyContent: 'center', width: 54 },
  profileCopy: { alignItems: 'flex-end', flex: 1 },
  profileTitle: { fontSize: typography.h2, fontWeight: '700' },
  profileText: { fontSize: typography.bodySmall, marginTop: 4 },
  links: { marginTop: 2 },
  link: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row-reverse', gap: spacing.sm, minHeight: 75 },
  linkIcon: { alignItems: 'center', borderRadius: radii.sm, height: 40, justifyContent: 'center', width: 40 },
  linkCopy: { alignItems: 'flex-end', flex: 1 },
  linkTitle: { fontSize: typography.body, fontWeight: '700' },
  linkSubtitle: { fontSize: typography.caption, marginTop: 3 },
  version: { fontSize: typography.caption, marginTop: spacing.xxl, textAlign: 'center' },
  hadithCard: { borderRadius: radii.md, padding: spacing.md },
  hadithTitle: { fontSize: typography.body, fontWeight: '700', lineHeight: 25, textAlign: 'right' },
  hadithText: { fontSize: typography.bodySmall, lineHeight: 24, marginTop: spacing.sm, textAlign: 'right' },
  hadithSource: { fontSize: typography.caption, marginTop: spacing.md, textAlign: 'right' },
  emptyText: { fontSize: typography.bodySmall, textAlign: 'right' },
});