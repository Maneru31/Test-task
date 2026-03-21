// Этап 3: ContributeBottomSheet — форма вклада в групповую покупку
// Поля: сумма (числовое, обязательно > 0), сообщение (необязательно).
// Кнопка «Внести вклад» → POST /items/{id}/contributions.

import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { BottomSheet } from '@/components/common/BottomSheet';
import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/common/Button';
import { useAddContribution } from '@/hooks/useContributions';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';

interface ContributeForm {
  amount: string;
  note: string;
}

interface ContributeBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  itemId: string;
  slug: string;
}

export function ContributeBottomSheet({
  visible,
  onClose,
  itemId,
  slug,
}: ContributeBottomSheetProps) {
  const addContribution = useAddContribution(slug);
  const showToast = useUiStore((s) => s.showToast);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ContributeForm>({
    defaultValues: { amount: '', note: '' },
  });

  const onSubmit = async (data: ContributeForm) => {
    const amount = parseFloat(data.amount.replace(',', '.')); // поддержка запятой

    // Дополнительная проверка (схема тоже валидирует, но на случай платформенных различий)
    if (isNaN(amount) || amount <= 0) return;

    try {
      await addContribution.mutateAsync({
        itemId,
        amount,
        note: data.note.trim() || undefined,
      });
      showToast('Вклад внесён!', 'success');
      reset();
      onClose();
    } catch {
      showToast('Не удалось внести вклад', 'error');
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Внести вклад</Text>

        <FormInput<ContributeForm>
          name="amount"
          control={control}
          rules={{
            required: 'Введите сумму',
            validate: (v) => {
              const n = parseFloat(String(v).replace(',', '.'));
              return (!isNaN(n) && n > 0) || 'Сумма должна быть больше 0';
            },
          }}
          label="Сумма (₽)"
          placeholder="0"
          keyboardType="decimal-pad"
          returnKeyType="next"
        />

        <FormInput<ContributeForm>
          name="note"
          control={control}
          label="Сообщение (необязательно)"
          placeholder="Ваше пожелание..."
          multiline
          numberOfLines={2}
          returnKeyType="done"
        />

        <Button
          title="Внести вклад"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting || addContribution.isPending}
          style={styles.submitButton}
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
});
