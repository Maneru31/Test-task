// Этап 4: PublicListScreen обновлён — добавлен useListWebSocket для real-time (FR-28)
// Этап 3: PublicListScreen — публичный просмотр вишлиста по slug
// Доступен без авторизации (INV-06: зарегистрирован в RootNavigator, вне Auth/App веток).
// FlashList позиций, GuestBanner, pull-to-refresh, skeleton (4 заглушки), EmptyState.
// Шеринг через нативный Share Sheet (FR-27).
// onRequireGuest — показывает GuestNameBottomSheet перед любым действием гостя.

import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useGetPublicList } from '@/hooks/usePublicList';
import { useListWebSocket } from '@/hooks/useListWebSocket';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { GuestBanner } from '@/components/public/GuestBanner';
import { GuestNameBottomSheet } from '@/components/public/GuestNameBottomSheet';
import { ItemPublicCard } from '@/components/public/ItemPublicCard';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { EmptyState } from '@/components/common/EmptyState';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import type { RootStackParamList } from '@/types/navigation';
import type { PublicItem } from '@/types/api';

// Средняя высота ItemPublicCard: 72px image + 2*8 padding + 2*4 margin
const ESTIMATED_ITEM_SIZE = 100;

type Nav = NativeStackNavigationProp<RootStackParamList, 'PublicList'>;
type Route = RouteProp<RootStackParamList, 'PublicList'>;

export function PublicListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { slug } = route.params;

  const [showGuestName, setShowGuestName] = useState(false);

  const { data, isLoading, refetch, isRefetching, error } = useGetPublicList(slug);

  // Real-time обновления через WebSocket (INV-08: только invalidateQueries)
  useListWebSocket(slug);

  // Кнопка «Поделиться» в header — нативный iOS Share Sheet
  const handleShare = useCallback(() => {
    Share.share({
      message: `Посмотрите мой список желаний: wishify://list/${slug}`,
      url: `wishify://list/${slug}`,
    });
  }, [slug]);

  // Устанавливаем заголовок и кнопку шеринга после загрузки данных
  useLayoutEffect(() => {
    navigation.setOptions({
      title: data?.title ?? 'Список желаний',
      headerRight: () => (
        <TouchableOpacity
          onPress={handleShare}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.shareButton}>Поделиться</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, data?.title, handleShare]);

  const handleRequireGuest = useCallback(() => {
    setShowGuestName(true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: PublicItem }) => (
      <ItemPublicCard
        item={item}
        slug={slug}
        onRequireGuest={handleRequireGuest}
      />
    ),
    [slug, handleRequireGuest],
  );

  // ─── Skeleton при первой загрузке ─────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <OfflineBanner />
        <GuestBanner />
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <OfflineBanner />
        <GuestBanner />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Не удалось загрузить список</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Основной экран ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineBanner />
      {/* Persistent-полоска с именем гостя (FR-24) */}
      <GuestBanner />

      <FlashList
        data={data?.items ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={ESTIMATED_ITEM_SIZE}
        contentContainerStyle={styles.listContent}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <EmptyState
            title="Список пуст"
            description="В этом списке пока нет желаний"
          />
        }
      />

      {/* GuestNameBottomSheet — единственный экземпляр на экране */}
      <GuestNameBottomSheet
        visible={showGuestName}
        onClose={() => setShowGuestName(false)}
        onSuccess={() => setShowGuestName(false)}
        slug={slug}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  skeletonList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  retryText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  shareButton: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
