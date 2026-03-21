import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // INV-09
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi, startGoogleOAuth } from '@/api/auth';
import { Button } from '@/components/common/Button';
import { FormInput } from '@/components/common/FormInput';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { loginSchema, LoginFormData } from '@/utils/validators';
import { colors } from '@/constants/colors';
import type { AuthStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { setAuth } = useAuthStore();
  const showToast = useUiStore((s) => s.showToast);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const { access_token, user } = await authApi.login(data.email, data.password);
      await setAuth(user, access_token);
    } catch {
      showToast('Неверный email или пароль', 'error');
    }
  };

  const onGooglePress = async () => {
    setGoogleLoading(true);
    try {
      const token = await startGoogleOAuth();
      if (token) {
        const user = await authApi.me();
        await setAuth(user, token);
      }
    } catch {
      showToast('Не удалось войти через Google', 'error');
    } finally {
      setGoogleLoading(false);
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
          <Text style={styles.title}>Войти</Text>
          <Text style={styles.subtitle}>Введите данные вашего аккаунта</Text>

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
            placeholder="••••••"
            secureTextEntry
            textContentType="password"
          />

          <Button
            title="Войти"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={styles.submitButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>или</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Продолжить с Google"
            variant="secondary"
            onPress={onGooglePress}
            loading={googleLoading}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.link}
          >
            <Text style={styles.linkText}>
              Нет аккаунта?{' '}
              <Text style={styles.linkTextBold}>Зарегистрироваться</Text>
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.textSecondary,
    fontSize: 14,
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
