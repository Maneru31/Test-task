// Этап 3: FundingProgress — progress bar + суммы для групповой покупки
// Граничные случаи:
//   0%    — полоска пустая
//   100%  — полоска заполнена зелёным, метка «Собрано!»
//   >100% — полоска зафиксирована на 100% (Math.min), метка «Собрано!»

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { borderRadius, spacing } from '@/constants/layout';
import { formatPrice } from '@/utils/formatters';

interface FundingProgressProps {
  contributed: number;
  target: number;
  currency: string;
}

export function FundingProgress({ contributed, target, currency }: FundingProgressProps) {
  // Процент заполнения: ограничиваем сверху 100%, снизу 0%
  const percentage = target > 0 ? Math.min(Math.max(contributed / target, 0), 1) : 0;
  const isComplete = target > 0 && contributed >= target;

  return (
    <View style={styles.container} testID="funding-progress">
      {/* Дорожка прогресс-бара */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${percentage * 100}%` as `${number}%` },
            isComplete && styles.fillComplete,
          ]}
          testID="funding-fill"
        />
      </View>

      {/* Суммы: собрано / цель */}
      <View style={styles.labels}>
        <Text style={[styles.contributed, isComplete && styles.contributedComplete]} testID="funding-contributed">
          {formatPrice(contributed, currency)}
        </Text>
        <Text style={styles.target} testID="funding-target">
          из {formatPrice(target, currency)}
        </Text>
      </View>

      {/* Метка «Собрано!» — только при 100%+ */}
      {isComplete && (
        <Text style={styles.completeLabel} testID="funding-complete-label">
          Собрано!
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  track: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  fillComplete: {
    backgroundColor: colors.success,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs / 2,
  },
  contributed: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  contributedComplete: {
    color: colors.success,
  },
  target: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  completeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
    textAlign: 'center',
    marginTop: spacing.xs / 2,
  },
});
