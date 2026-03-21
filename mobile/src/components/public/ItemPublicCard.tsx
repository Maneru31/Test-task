// Этап 3: Карточка позиции для зрителя публичного списка
// Показывает: изображение, название, цену, статус (Свободно / Зарезервировано).
// Для обычной позиции: ReserveButton.
// Для групповой покупки: FundingProgress + кнопка «Внести вклад».
// onRequireGuest — вызывается, если у пользователя нет ни auth-, ни guest-сессии.

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { colors } from '@/constants/colors';
import { borderRadius, spacing } from '@/constants/layout';
import { formatPrice } from '@/utils/formatters';
import { guestService } from '@/services/guestService';
import { useAuthStore } from '@/store/authStore';
import { ReserveButton } from './ReserveButton';
import { FundingProgress } from './FundingProgress';
import { ContributeBottomSheet } from './ContributeBottomSheet';
import type { PublicItem } from '@/types/api';

interface ItemPublicCardProps {
  item: PublicItem;
  slug: string;
  /** Вызывается перед любым действием, когда нет сессии */
  onRequireGuest?: () => void;
}

export function ItemPublicCard({ item, slug, onRequireGuest }: ItemPublicCardProps) {
  const [showContribute, setShowContribute] = useState(false);

  const handleContribute = () => {
    // Проверяем сессию перед открытием формы вклада
    const isAuthenticated = useAuthStore.getState().status === 'authenticated';
    const hasGuestToken = Boolean(guestService.getToken());

    if (!isAuthenticated && !hasGuestToken) {
      onRequireGuest?.();
      return;
    }

    setShowContribute(true);
  };

  return (
    <View style={styles.card}>
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

        {item.price != null && (
          <Text style={styles.price}>{formatPrice(item.price, item.currency)}</Text>
        )}

        {/* Статус резервирования — для обычных позиций */}
        {!item.is_group_fund && (
          <Text style={[styles.status, item.is_reserved && styles.statusReserved]}>
            {item.is_reserved ? 'Зарезервировано' : 'Свободно'}
          </Text>
        )}

        {/* Групповая покупка: прогресс + кнопка вклада */}
        {item.is_group_fund && item.target_amount != null ? (
          <>
            <FundingProgress
              contributed={item.total_contributed ?? 0}
              target={item.target_amount}
              currency={item.currency}
            />
            <TouchableOpacity onPress={handleContribute} style={styles.contributeButton}>
              <Text style={styles.contributeText}>Внести вклад</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Обычная позиция: кнопка резервирования */
          <ReserveButton
            itemId={item.id}
            slug={slug}
            isReserved={item.is_reserved}
            reservedByMe={item.reserved_by_me}
            onRequireGuest={onRequireGuest}
          />
        )}
      </View>

      {/* ContributeBottomSheet монтируется только для групповых позиций */}
      {item.is_group_fund && (
        <ContributeBottomSheet
          visible={showContribute}
          itemId={item.id}
          slug={slug}
          onClose={() => setShowContribute(false)}
        />
      )}
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
    alignItems: 'flex-start',
  },
  image: {
    width: 72,
    height: 72,
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
    fontSize: 30,
  },
  content: {
    flex: 1,
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
    marginBottom: spacing.xs / 2,
  },
  status: {
    fontSize: 12,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  statusReserved: {
    color: colors.textSecondary,
  },
  contributeButton: {
    marginTop: spacing.xs,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  contributeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
