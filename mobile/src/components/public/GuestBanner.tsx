// Этап 3: GuestBanner — persistent-полоска с именем гостя и кнопкой «Войти»
// Показывается только при наличии гостевой сессии (guestService.getDisplayName()).
// «Войти» → навигирует на Auth/Login (INV-06: PublicListScreen в RootNavigator).

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { guestService } from '@/services/guestService';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import type { RootStackParamList } from '@/types/navigation';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function GuestBanner() {
  const navigation = useNavigation<RootNav>();
  const displayName = guestService.getDisplayName();

  // Не рендерим ничего, если гостевая сессия отсутствует
  if (!displayName) return null;

  const handleLogin = () => {
    // Навигируем на экран логина; после успешного входа пользователь
    // попадает в AppNavigator, но ссылку на список можно открыть заново.
    navigation.navigate('Auth', { screen: 'Login' } as Parameters<typeof navigation.navigate>[1]);
  };

  return (
    <View style={styles.banner} testID="guest-banner">
      <Text style={styles.text} testID="guest-banner-name" numberOfLines={1}>
        Вы входите как <Text style={styles.name}>{displayName}</Text>
      </Text>
      <TouchableOpacity
        onPress={handleLogin}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID="guest-banner-login"
      >
        <Text style={styles.loginText}>Войти</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    fontWeight: '600',
  },
  loginText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
});
