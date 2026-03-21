import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore } from '@/store/uiStore';
import { colors } from '@/constants/colors';

const ANIMATION_DURATION = 250;

const TOAST_BG: Record<string, string> = {
  success: colors.success,
  error: colors.error,
  info: colors.primary,
};

export function Toast() {
  const toasts = useUiStore((s) => s.toasts);
  const hideToast = useUiStore((s) => s.hideToast);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const prevIdRef = useRef<string | null>(null);

  // Показываем самый последний toast
  const current = toasts[toasts.length - 1] ?? null;

  const animateIn = useCallback(() => {
    translateY.setValue(-100);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  useEffect(() => {
    if (current && current.id !== prevIdRef.current) {
      prevIdRef.current = current.id;
      animateIn();
    }
    if (!current) {
      prevIdRef.current = null;
    }
  }, [current, animateIn]);

  if (!current) return null;

  const bg = TOAST_BG[current.type] ?? colors.primary;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 8, backgroundColor: bg },
        { transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity
        onPress={() => hideToast(current.id)}
        activeOpacity={0.9}
        style={styles.inner}
      >
        <Text style={styles.message}>{current.message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  inner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  message: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
