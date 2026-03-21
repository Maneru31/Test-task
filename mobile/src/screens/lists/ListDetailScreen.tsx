// Этап 4: ListDetailScreen обновлён
// • DraggableFlatList вместо FlashList — drag-and-drop позиций (FR-15)
// • Debounce 500мс для PATCH reorder: берём финальный порядок в момент исполнения колбэка
// • useListWebSocket — real-time обновления через WS (FR-28, INV-08)
// • Error state с кнопкой «Повторить»
// • OfflineBanner поверх контента

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ItemCard } from '@/components/lists/ItemCard';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useGetListItems, useDeleteItem, useReorderItems } from '@/hooks/useItems';
import { useListWebSocket } from '@/hooks/useListWebSocket';
import { useUiStore } from '@/store/uiStore';
import type { ListsStackParamList } from '@/types/navigation';
import type { Item } from '@/types/api';

const REORDER_DEBOUNCE_MS = 500;

type Nav = NativeStackNavigationProp<ListsStackParamList, 'ListDetail'>;
type Route = RouteProp<ListsStackParamList, 'ListDetail'>;

export function ListDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { listId, title } = route.params;

  const { data, isLoading, isError, refetch, isRefetching } = useGetListItems(listId);
  const deleteItem = useDeleteItem(listId);
  const reorderItems = useReorderItems(listId);
  const showToast = useUiStore((s) => s.showToast);

  // Локальный порядок позиций для оптимистичного обновления DnD
  const [localItems, setLocalItems] = useState<Item[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Синхронизируем локальный порядок с серверными данными
  useEffect(() => {
    if (data?.items) {
      setLocalItems(data.items);
    }
  }, [data?.items]);

  // Real-time обновления через WebSocket (INV-08: только invalidateQueries)
  useListWebSocket(data?.public_slug ?? '');

  const handleShare = useCallback(async () => {
    if (!data) return;
    await Share.share({
      url: `wishify://list/${data.public_slug}`,
      message: `Мой вишлист «${title}»: wishify://list/${data.public_slug}`,
    });
  }, [data, title]);

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      Alert.alert('Удалить желание?', 'Это действие нельзя отменить.', [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => deleteItem.mutate(itemId),
        },
      ]);
    },
    [deleteItem],
  );

  // Debounce 500мс: берём финальный item_ids в момент выполнения колбэка
  const handleDragEnd = useCallback(
    ({ data: newOrder }: { data: Item[] }) => {
      setLocalItems(newOrder);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        reorderItems.mutate(newOrder.map((i) => i.id), {
          onError: () => {
            showToast('Не удалось изменить порядок', 'error');
            // Откат к серверному порядку
            if (data?.items) setLocalItems(data.items);
          },
        });
      }, REORDER_DEBOUNCE_MS);
    },
    [reorderItems, data?.items, showToast],
  );

  // Кнопки в header навигации
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.headerButton}>Поделиться</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('ListSettings', { listId })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.headerButton}>Настройки</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, handleShare, listId]);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Item>) => (
      <ScaleDecorator>
        <ItemCard
          item={item}
          isDragging={isActive}
          onEdit={() => navigation.navigate('EditItem', { listId, itemId: item.id })}
          onDelete={() => handleDeleteItem(item.id)}
          onDragStart={drag}
        />
      </ScaleDecorator>
    ),
    [navigation, listId, handleDeleteItem],
  );

  // ─── Skeleton при первой загрузке ─────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <OfflineBanner />
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </SafeAreaView>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <OfflineBanner />
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

      <DraggableFlatList
        data={localItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onDragEnd={handleDragEnd}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="Список пуст"
            description="Добавьте первое желание"
            actionLabel="Добавить желание"
            onAction={() => navigation.navigate('AddItem', { listId })}
          />
        }
      />

      {/* Footer — добавить желание */}
      <TouchableOpacity
        style={styles.footer}
        onPress={() => navigation.navigate('AddItem', { listId })}
        activeOpacity={0.8}
      >
        <Text style={styles.footerText}>+ Добавить желание</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: 72,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerButton: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
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
});
