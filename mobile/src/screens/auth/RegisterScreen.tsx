import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // INV-09
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi } from '@/api/auth';
import { Button } from '@/components/common/Button';
import { FormInput } from '@/components/common/FormInput';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { registerSchema, RegisterFormData } from '@/utils/validators';
import { colors } from '@/constants/colors';
import type { AuthStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { setAuth } = useAuthStore();
  const showToast = useUiStore((s) => s.showToast);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { display_name: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { access_token, user } = await authApi.register(
        data.display_name,
        data.email,
        data.password,
      );
      await setAuth(user, access_token);
    } catch (err: any) {
      const message =
        err?.response?.status === 409
          ? 'Этот email уже зарегистрирован'
          : 'Не удалось зарегистрироваться';
      showToast(message, 'error');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Регистрация</Text>
          <Text style={styles.subtitle}>Создайте новый аккаунт</Text>

          <FormInput
            control={control}
            name="display_name"
            label="Имя"
            placeholder="Ваше имя"
            autoCapitalize="words"
            textContentType="name"
          />

          <FormInput
            control={control}
            name="email"
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
          />

          <FormInput
            control={control}
            name="password"
            label="Пароль"
            placeholder="Минимум 6 символов"
            secureTextEntry
            textContentType="newPassword"
          />

          <Button
            title="Зарегистрироваться"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={styles.submitButton}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.link}
          >
            <Text style={styles.linkText}>
              Уже есть аккаунт?{' '}
              <Text style={styles.linkTextBold}>Войти</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  submitButton: {
    marginTop: 8,
  },
  link: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  linkTextBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});
