// Этап 2: Экран профиля
// Аватар (FastImage) с fallback — инициалы из display_name
// Имя, email, кнопка «Выйти» через authStore.logout()

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FastImage from 'react-native-fast-image';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useAuthStore } from '@/store/authStore';

/** Аватар с инициалами как fallback — когда avatar_url отсутствует */
function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View style={styles.initialsAvatar}>
      <Text style={styles.initialsText}>{initials}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {user.avatar_url ? (
          <FastImage
            source={{ uri: user.avatar_url }}
            style={styles.avatar}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <InitialsAvatar name={user.display_name} />
        )}
        <Text style={styles.name}>{user.display_name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Button
        title="Выйти"
        variant="secondary"
        onPress={logout}
        style={styles.logoutButton}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
    flex: 1,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.md,
  },
  initialsAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  initialsText: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.surface,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  logoutButton: {
    marginBottom: spacing.lg,
  },
});
