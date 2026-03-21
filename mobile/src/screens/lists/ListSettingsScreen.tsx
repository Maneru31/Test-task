// Этап 2: Настройки списка — редактирование метаданных и «Опасная зона»
// PATCH полей (название, описание); кнопка «Удалить список» с confirm-диалогом

import React, { useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Button } from '@/components/common/Button';
import { FormInput } from '@/components/common/FormInput';
import { colors } from '@/constants/colors';
import { borderRadius, spacing } from '@/constants/layout';
import { createListSchema, type CreateListFormData } from '@/utils/validators';
import { useGetLists, useUpdateList, useDeleteList } from '@/hooks/useLists';
import { useGetListItems } from '@/hooks/useItems';
import type { ListsStackParamList } from '@/types/navigation';

type Route = RouteProp<ListsStackParamList, 'ListSettings'>;

export function ListSettingsScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { listId } = route.params;

  const { data: lists } = useGetLists();
  const { data: listDetail } = useGetListItems(listId);
  // Use cached list from the dashboard query; fall back to the detail fetch on cold navigation
  const list = lists?.find((l) => l.id === listId) ?? listDetail;
  const updateList = useUpdateList();
  const deleteList = useDeleteList();

  const {
    control,
    handleSubmit,
    reset,
  } = useForm<CreateListFormData>({
    resolver: zodResolver(createListSchema),
    defaultValues: {
      title: '',
      description: '',
      occasion: null,
      occasion_date: null,
    },
  });

  // Предзаполняем форму данными из кеша
  useEffect(() => {
    if (list) {
      reset({
        title: list.title,
        description: list.description ?? '',
        occasion: list.occasion,
        occasion_date: list.occasion_date,
      });
    }
  }, [list, reset]);

  const onSubmit = async (data: CreateListFormData) => {
    await updateList.mutateAsync({ listId, data });
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(
      'Удалить список?',
      'Все желания в списке тоже удалятся. Действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteList.mutateAsync(listId);
              // Оптимистичное удаление уже выполнено, возвращаемся на Dashboard
              (navigation as any).popToTop();
            } catch {
              // Откат выполнен в хуке
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <FormInput
            control={control}
            name="title"
            label="Название"
            placeholder="Мой вишлист"
          />

          <FormInput
            control={control}
            name="description"
            label="Описание (необязательно)"
            placeholder="Описание вашего списка"
            multiline
            numberOfLines={3}
          />

          <Button
            title="Сохранить изменения"
            onPress={handleSubmit(onSubmit)}
            loading={updateList.isPending}
            style={styles.saveButton}
          />

          {/* Danger zone */}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>Опасная зона</Text>
            <Button
              title="Удалить список"
              variant="danger"
              onPress={handleDelete}
              loading={deleteList.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
  dangerZone: {
    marginTop: spacing.xxl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: borderRadius.lg,
    borderStyle: 'dashed',
  },
  dangerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
});
