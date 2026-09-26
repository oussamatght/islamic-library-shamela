import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useFavoritesList } from '@/hooks/useAppState';
import type { FavoriteItem } from '@/lib/storage';

type Props = {
  item: Omit<FavoriteItem, 'id' | 'createdAt'>;
  variant?: 'plain' | 'soft';
};

/** Heart toggle persisting to AsyncStorage; reflects live favorite state. */
export function FavoriteButton({ item, variant = 'plain' }: Props) {
  const colors = useColors();
  const { isFavorite, toggle } = useFavoritesList();
  const [busy, setBusy] = useState(false);
  const active = isFavorite(item.kind, item.refId);

  const handlePress = () => {
    if (busy) return;
    setBusy(true);
    void toggle(item).finally(() => setBusy(false));
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? `إزالة ${item.title} من المفضلة` : `حفظ ${item.title} في المفضلة`}
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [
        variant === 'soft' && styles.soft,
        { backgroundColor: variant === 'soft' ? colors.secondary : 'transparent' },
        pressed ? { opacity: 0.6 } : null,
      ]}
    >
      <Feather
        name={active ? 'heart' : 'heart'}
        size={18}
        color={active ? '#B74C43' : colors.mutedForeground}
        style={active ? styles.filled : undefined}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  soft: {
    alignItems: 'center',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  filled: {
    // Feather has no filled heart; simulate with a heavier stroke effect.
    textShadowColor: 'rgba(183,76,67,0.35)',
    textShadowRadius: 6,
  },
});
