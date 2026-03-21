// Этап 2: Форма создания нового вишлиста в BottomSheet
// Поля: название (обязательно), описание, Picker повода (chips), DatePicker
// Использует react-hook-form + zod (createListSchema)
// DatePicker: @react-native-community/datetimepicker

import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { FormInput } from '@/components/common/FormInput';
import { colors } from '@/constants/colors';
import { borderRadius, spacing } from '@/constants/layout';
import { createListSchema, type CreateListFormData } from '@/utils/validators';

const OCCASIONS: Array<{ value: CreateListFormData['occasion']; label: string }> = [
  { value: null, label: 'Без повода' },
  { value: 'birthday', label: '🎂 День рождения' },
  { value: 'new_year', label: '🎆 Новый год' },
  { value: 'wedding', label: '💍 Свадьба' },
  { value: 'other', label: '🎉 Другое' },
];

interface CreateListBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateListFormData) => Promise<void>;
}

export function CreateListBottomSheet({
  visible,
  onClose,
  onSubmit,
}: CreateListBottomSheetProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateListFormData>({
    resolver: zodResolver(createListSchema),
    defaultValues: {
      title: '',
      description: '',
      occasion: null,
      occasion_date: null,
    },
  });

  const selectedOccasion = watch('occasion');
  const occasionDate = watch('occasion_date');

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: CreateListFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Новый список</Text>

        <FormInput
          control={control}
          name="title"
          label="Название"
          placeholder="Мой вишлист"
          error={errors.title?.message}
        />

        <FormInput
          control={control}
          name="description"
          label="Описание (необязательно)"
          placeholder="Описание вашего списка"
          multiline
          numberOfLines={3}
          error={errors.description?.message}
        />

        <Text style={styles.sectionLabel}>Повод</Text>
        <View style={styles.occasionRow}>
          {OCCASIONS.map((o) => (
            <TouchableOpacity
              key={String(o.value)}
              style={[
                styles.chip,
                selectedOccasion === o.value && styles.chipSelected,
              ]}
              onPress={() => setValue('occasion', o.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedOccasion === o.value && styles.chipTextSelected,
                ]}
              >
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* DatePicker показывается только при выбранном поводе */}
        {selectedOccasion !== null && (
          <View style={styles.dateSection}>
            <Text style={styles.sectionLabel}>Дата</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateButtonText}>
                {occasionDate
                  ? new Date(occasionDate).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Выбрать дату'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={occasionDate ? new Date(occasionDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              // На Android диалог закрывается сам; на iOS оставляем открытым
              if (Platform.OS !== 'ios') setShowDatePicker(false);
              if (date) {
                setValue('occasion_date', date.toISOString().split('T')[0]);
              }
            }}
          />
        )}

        {/* Кнопка подтверждения на iOS под spinner'ом */}
        {showDatePicker && Platform.OS === 'ios' && (
          <Button
            title="Готово"
            variant="secondary"
            onPress={() => setShowDatePicker(false)}
            style={styles.doneButton}
          />
        )}

        <Button
          title="Создать список"
          onPress={handleSubmit(handleFormSubmit)}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  occasionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  dateSection: {
    marginTop: spacing.xs,
  },
  dateButton: {
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  dateButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  doneButton: {
    marginTop: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
});
