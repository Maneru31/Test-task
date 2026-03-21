// Этап 4: OfflineBanner — персистентная полоска «Нет подключения»
// Показывается поверх содержимого экрана при isOffline === true в uiStore.
// Прячется автоматически при восстановлении сети (useNetworkStatus обновляет uiStore).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';

export function OfflineBanner() {
  const isOffline = useUiStore((s) => s.isOffline);

  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Нет подключения к сети</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '600',
  },
});
