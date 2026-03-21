// Этап 3: GuestNameBottomSheet — запрос имени перед резервированием / вкладом
// Поля: display_name (обязательно).
// «Продолжить» → POST /auth/guest → сохраняет сессию в guestService (MMKV, INV-01 соблюдён).
// «Войти в аккаунт» → навигирует на Auth/Login.

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useForm } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomSheet } from '@/components/common/BottomSheet';
import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/common/Button';
import { authApi } from '@/api/auth';
import { guestService } from '@/services/guestService';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import type { RootStackParamList } from '@/types/navigation';

interface GuestNameForm {
  display_name: string;
}

interface GuestNameBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Вызывается после успешного создания гостевой сессии */
  onSuccess: () => void;
  slug: string;
}

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function GuestNameBottomSheet({
  visible,
  onClose,
  onSuccess,
  slug: _slug, // сохраняем для будущего returnTo
}: GuestNameBottomSheetProps) {
  const navigation = useNavigation<RootNav>();
  const showToast = useUiStore((s) => s.showToast);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<GuestNameForm>({
    defaultValues: { display_name: '' },
  });

  const onSubmit = async (data: GuestNameForm) => {
    try {
      const session = await authApi.createGuestSession(data.display_name.trim());
      // guest_token — в MMKV через guestService (не Keychain, INV-01 разрешает для гостей)
      guestService.saveSession(session.guest_token, session.display_name);
      reset();
      onClose();
      onSuccess(); // сигнализируем родителю: сессия готова
    } catch {
      showToast('Не удалось создать сессию, попробуйте ещё раз', 'error');
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleLogin = () => {
    reset();
    onClose();
    navigation.navigate('Auth' as any, { screen: 'Login' } as any);
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Как вас зовут?</Text>
        <Text style={styles.subtitle}>
          Введите имя, чтобы зарезервировать позицию или внести вклад
        </Text>

        <FormInput<GuestNameForm>
          name="display_name"
          control={control}
          rules={{
            required: 'Введите имя',
            minLength: { value: 1, message: 'Имя не может быть пустым' },
            maxLength: { value: 64, message: 'Имя слишком длинное' },
          }}
          label="Ваше имя"
          placeholder="Например, Алексей"
          autoCapitalize="words"
          returnKeyType="done"
        />

        <Button
          title="Продолжить"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          style={styles.continueButton}
        />

        <TouchableOpacity onPress={handleLogin} style={styles.loginLink}>
          <Text style={styles.loginText}>Войти в аккаунт</Text>
        </TouchableOpacity>
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  continueButton: {
    marginTop: spacing.xs,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loginText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});
