import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';

/**
 * SplashScreen — показывается пока authStore.initialize() выполняется.
 * После initialize() RootNavigator автоматически переключит на App или Auth.
 * Этот компонент используется как standalone, когда status === 'loading'.
 */
export function SplashScreen() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Wishify</Text>
      <ActivityIndicator
        style={styles.spinner}
        size="large"
        color={colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  spinner: {
    marginTop: 32,
  },
});
