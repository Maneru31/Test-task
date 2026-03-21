// Этап 2: Экран добавления желания
// Поля: URL товара (с автоскрапингом), название, описание, цена, групповая покупка
// URL-поле запускает useScrapedItem (debounce 800 мс, silent fail FR-16)
// При успешном скрапинге автозаполняет название, цену, валюту

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
import { useCreateItem } from '@/hooks/useItems';
import { useScrapedItem } from '@/hooks/useScrape';
import type { ListsStackParamList } from '@/types/navigation';

type Route = RouteProp<ListsStackParamList, 'AddItem'>;

export function AddItemScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { listId } = route.params;

  const createItem = useCreateItem(listId);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
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

  const urlValue = watch('url');
  const isGroupFund = watch('is_group_fund');
  const { result: scraped, isLoading: isScraping } = useScrapedItem(urlValue);

  // Автозаполнение полей из результата скрапинга (FR-16)
  useEffect(() => {
    if (!scraped) return;
    if (scraped.title) setValue('name', scraped.title);
    if (scraped.price != null) setValue('price', scraped.price);
    if (scraped.currency) setValue('currency', scraped.currency);
  }, [scraped, setValue]);

  const onSubmit = async (data: ItemFormData) => {
    await createItem.mutateAsync(data);
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

          {isScraping ? (
            <Text style={styles.hint}>Загружаем данные о товаре…</Text>
          ) : null}

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

          {/* Переключатель групповой покупки */}
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchTitle}>Групповая покупка</Text>
              <Text style={styles.switchSubtitle}>
                Несколько человек могут сложиться
              </Text>
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
            title="Добавить желание"
            onPress={handleSubmit(onSubmit)}
            loading={createItem.isPending}
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
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
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
  switchSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
});
