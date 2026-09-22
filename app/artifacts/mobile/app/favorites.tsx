import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { IconButton, Screen, EmptyState } from '@/components/ui';
import { typography } from '@/constants/tokens';
import { useColors } from '@/hooks/useColors';

export default function FavoritesScreen() {
  const colors = useColors();
  const router = useRouter();
  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <IconButton icon="arrow-right" label="العودة" onPress={() => router.back()} variant="soft" />
        <Text style={[styles.title, { color: colors.foreground }]}>المفضلة</Text>
      </View>
      <EmptyState title="لم تحفظ أي عنصر بعد" message="ستظهر هنا الآيات والأحاديث والأذكار التي تختار الاحتفاظ بها." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row-reverse', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: typography.h1, fontWeight: '700', textAlign: 'right' },
});