// Этап 2: Skeleton-placeholder для карточки списка / позиции
// Анимация пульсации через Animated.loop (opacity 0.4 ↔ 1)

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';
import { borderRadius, spacing } from '@/constants/layout';

export function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {/* Заглушка изображения */}
      <View style={styles.imageBlock} />
      {/* Заглушка заголовка */}
      <View style={styles.titleBlock} />
      {/* Заглушка подзаголовка */}
      <View style={styles.subtitleBlock} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: spacing.sm / 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageBlock: {
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  titleBlock: {
    height: 14,
    width: '80%',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  subtitleBlock: {
    height: 12,
    width: '50%',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.border,
  },
});
