// Этап 2: Карточка вишлиста для 2-колонной сетки дашборда
// Swipe-to-delete через react-native-gesture-handler Swipeable
// Поддерживает повод (occasion), дату и счётчик позиций

import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { colors } from '@/constants/colors';
import { borderRadius, spacing } from '@/constants/layout';
import { formatDate } from '@/utils/formatters';
import type { WishList } from '@/types/api';

const OCCASION_LABELS: Record<string, string> = {
  birthday: '🎂 День рождения',
  new_year: '🎆 Новый год',
  wedding: '💍 Свадьба',
  other: '🎉 Другое',
};

interface ListCardProps {
  list: WishList;
  onPress: () => void;
  onDelete: () => void;
}

export function ListCard({ list, onPress, onDelete }: ListCardProps) {
  const renderRightActions = () => (
    <TouchableOpacity style={styles.deleteAction} onPress={onDelete} activeOpacity={0.8}>
      <Text style={styles.deleteText}>Удалить</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
    >
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.title} numberOfLines={2}>
          {list.title}
        </Text>
        {list.occasion ? (
          <Text style={styles.occasion}>{OCCASION_LABELS[list.occasion] ?? list.occasion}</Text>
        ) : null}
        {list.occasion_date ? (
          <Text style={styles.date}>{formatDate(list.occasion_date)}</Text>
        ) : null}
        <Text style={styles.itemCount}>
          {list.item_count} {getItemWord(list.item_count)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

/** Склонение слова "желание" */
function getItemWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'желаний';
  if (mod10 === 1) return 'желание';
  if (mod10 >= 2 && mod10 <= 4) return 'желания';
  return 'желаний';
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
    minHeight: 120,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  occasion: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: spacing.xs / 2,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  itemCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 'auto' as unknown as number,
  },
  deleteAction: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    margin: spacing.sm / 2,
    borderRadius: borderRadius.lg,
  },
  deleteText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 13,
  },
});
