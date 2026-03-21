// Этап 2: Карточка позиции (желания) в списке
// FastImage + fallback-заглушка, цена, иконки редактировать/удалить, drag-handle
// isDragging — поднимает тень карточки при перетаскивании (Этап 4)

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { colors } from '@/constants/colors';
import { borderRadius, spacing } from '@/constants/layout';
import { formatPrice } from '@/utils/formatters';
import type { Item } from '@/types/api';

interface ItemCardProps {
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
  /** Передаётся из DraggableFlatList (Этап 4): поднимает тень при перетаскивании */
  isDragging?: boolean;
  /** Вызывается при нажатии на drag-handle; передаёт управление DraggableFlatList */
  onDragStart?: () => void;
}

export function ItemCard({ item, onEdit, onDelete, isDragging = false, onDragStart }: ItemCardProps) {
  return (
    <View style={[styles.card, isDragging && styles.dragging]}>
      {/* Изображение товара */}
      {item.image_url ? (
        <FastImage
          source={{ uri: item.image_url }}
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderEmoji}>🎁</Text>
        </View>
      )}

      {/* Текстовый блок */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        {item.price != null ? (
          <Text style={styles.price}>{formatPrice(item.price, item.currency)}</Text>
        ) : null}
        {item.is_group_fund && item.target_amount != null ? (
          <Text style={styles.groupFund}>
            Группа: {formatPrice(item.target_amount, item.currency)}
          </Text>
        ) : null}
      </View>

      {/* Кнопки действий */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onEdit}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.actionIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={styles.actionButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
        {/* Drag handle — onPressIn активирует перетаскивание через DraggableFlatList */}
        <TouchableOpacity
          onPressIn={onDragStart}
          style={[styles.actionButton, styles.dragHandle]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.dragIcon}>⠿</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dragging: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    borderColor: colors.primary,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  imagePlaceholder: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    marginRight: spacing.xs,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  price: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  groupFund: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  actionButton: {
    padding: spacing.xs,
    minWidth: 32,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 16,
  },
  dragHandle: {
    opacity: 0.4,
  },
  dragIcon: {
    fontSize: 18,
    color: colors.textSecondary,
  },
});
