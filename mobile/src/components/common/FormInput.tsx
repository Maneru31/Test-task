import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Controller, FieldValues, Path, UseControllerProps } from 'react-hook-form';
import { colors } from '@/constants/colors';

interface FormInputProps<T extends FieldValues>
  extends Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur' | 'defaultValue'>,
    UseControllerProps<T> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function FormInput<T extends FieldValues>({
  name,
  control,
  rules,
  defaultValue,
  label,
  containerStyle,
  ...inputProps
}: FormInputProps<T>) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Controller
      name={name as Path<T>}
      control={control}
      rules={rules}
      defaultValue={defaultValue}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={[styles.container, containerStyle]}>
          {label && <Text style={styles.label}>{label}</Text>}
          <TextInput
            {...inputProps}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={() => {
              onBlur();
              setIsFocused(false);
            }}
            onFocus={() => setIsFocused(true)}
            style={[
              styles.input,
              isFocused && styles.inputFocused,
              error && styles.inputError,
              inputProps.style,
            ]}
            placeholderTextColor={colors.textDisabled}
          />
          {error && (
            <Text style={styles.errorText}>{error.message}</Text>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.error,
  },
});
