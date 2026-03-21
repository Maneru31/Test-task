// Этап 4: DashboardScreen обновлён — добавлены error state и OfflineBanner
// Этап 2: Dashboard — список всех вишлистов владельца
// FlatList 2 колонки, pull-to-refresh, skeleton 4 карточки при загрузке,
// EmptyState при пустом списке, FAB «+» для создания нового списка

import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreateListBottomSheet } from '@/components/lists/CreateListBottomSheet';
import { ListCard } from '@/components/lists/ListCard';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useGetLists, useCreateList, useDeleteList } from '@/hooks/useLists';
import { useUiStore } from '@/store/uiStore';
import type { ListsStackParamList } from '@/types/navigation';
import type { CreateListFormData } from '@/utils/validators';
import type { WishList } from '@/types/api';

type Nav = NativeStackNavigationProp<ListsStackParamList, 'Dashboard'>;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [showCreate, setShowCreate] = useState(false);

  const { data: lists, isLoading, isError, refetch, isRefetching } = useGetLists();
  const createList = useCreateList();
  const deleteList = useDeleteList();
  const showToast = useUiStore((s) => s.showToast);

  const handleCreate = useCallback(
    async (data: CreateListFormData) => {
      await createList.mutateAsync({
        title: data.title,
        description: data.description ?? undefined,
        occasion: data.occasion ?? undefined,
        occasion_date: data.occasion_date ?? undefined,
      });
      setShowCreate(false);
      showToast('Список создан', 'success');
    },
    [createList, showToast],
  );

  const handleDelete = useCallback(
    async (listId: string) => {
      try {
        await deleteList.mutateAsync(listId);
        showToast('Список удалён', 'success');
      } catch {
        // Оптимистичный откат уже выполнен в хуке; показываем toast
        showToast('Не удалось удалить список', 'error');
      }
    },
    [deleteList, showToast],
  );

  const renderItem = useCallback(
    ({ item }: { item: WishList }) => (
      <ListCard
        list={item}
        onPress={() =>
          navigation.navigate('ListDetail', { listId: item.id, title: item.title })
        }
        onDelete={() => handleDelete(item.id)}
      />
    ),
    [navigation, handleDelete],
  );

  // Skeleton при первой загрузке
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <OfflineBanner />
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeletonCell}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <OfflineBanner />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Не удалось загрузить списки</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineBanner />
      <FlatList
        data={lists ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <EmptyState
            title="Нет списков"
            description="Создайте свой первый вишлист и поделитесь им с близкими"
            actionLabel="Создать список"
            onAction={() => setShowCreate(true)}
          />
        }
      />

      {/* FAB для создания нового списка */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <CreateListBottomSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
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
    padding: spacing.sm,
    flexGrow: 1,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
  },
  skeletonCell: {
    width: '50%',
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
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: colors.surface,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '300',
  },
});
