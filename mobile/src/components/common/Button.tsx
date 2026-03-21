import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { colors } from '@/constants/colors';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      {...rest}
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
      style={[
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? colors.primary : colors.surface}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'secondary' ? styles.textSecondary : styles.textLight,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 44, // INV: 44pt touch target
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  textLight: {
    color: colors.surface,
  },
  textSecondary: {
    color: colors.primary,
  },
});
