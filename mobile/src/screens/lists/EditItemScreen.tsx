// Этап 2: Экран редактирования желания
// Предзаполняет форму данными из кеша (useGetListItems), отправляет PATCH

import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Button } from '@/components/common/Button';
import { FormInput } from '@/components/common/FormInput';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { itemSchema, type ItemFormData } from '@/utils/validators';
import { useGetListItems, useUpdateItem } from '@/hooks/useItems';
import type { ListsStackParamList } from '@/types/navigation';

type Route = RouteProp<ListsStackParamList, 'EditItem'>;

export function EditItemScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { listId, itemId } = route.params;

  const { data } = useGetListItems(listId);
  const item = data?.items?.find((i) => i.id === itemId);
  const updateItem = useUpdateItem(listId);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      description: '',
      url: '',
      price: null,
      currency: 'RUB',
      is_group_fund: false,
      target_amount: null,
    },
  });

  const isGroupFund = watch('is_group_fund');

  // Предзаполняем форму, как только данные загружены из кеша
  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        description: item.description ?? '',
        url: item.url ?? '',
        price: item.price,
        currency: item.currency ?? 'RUB',
        is_group_fund: item.is_group_fund,
        target_amount: item.target_amount,
      });
    }
  }, [item, reset]);

  const onSubmit = async (data: ItemFormData) => {
    await updateItem.mutateAsync({ itemId, data });
    navigation.goBack();
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
            name="url"
            label="URL товара (необязательно)"
            placeholder="https://..."
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FormInput
            control={control}
            name="name"
            label="Название"
            placeholder="Что вы хотите?"
          />

          <FormInput
            control={control}
            name="description"
            label="Описание (необязательно)"
            placeholder="Подробности…"
            multiline
            numberOfLines={3}
          />

          <FormInput
            control={control}
            name="price"
            label="Цена (необязательно)"
            placeholder="0"
            keyboardType="numeric"
          />

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>Групповая покупка</Text>
            </View>
            <Controller
              control={control}
              name="is_group_fund"
              render={({ field: { value, onChange } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              )}
            />
          </View>

          {isGroupFund ? (
            <FormInput
              control={control}
              name="target_amount"
              label="Целевая сумма"
              placeholder="0"
              keyboardType="numeric"
            />
          ) : null}

          <Button
            title="Сохранить"
            onPress={handleSubmit(onSubmit)}
            loading={updateItem.isPending}
            style={styles.submitButton}
          />
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  switchLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
});
