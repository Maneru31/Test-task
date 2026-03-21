// Этап 2: Тесты компонента Button
// Покрывает: все варианты (primary/secondary/danger), loading state, disabled state

import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/common/Button';

describe('Button', () => {
  it('renders with primary variant by default', () => {
    const { getByText } = render(<Button title="Press me" onPress={() => {}} />);
    expect(getByText('Press me')).toBeTruthy();
  });

  it('renders secondary variant', () => {
    const { getByText } = render(
      <Button title="Secondary" variant="secondary" onPress={() => {}} />,
    );
    expect(getByText('Secondary')).toBeTruthy();
  });

  it('renders danger variant', () => {
    const { getByText } = render(
      <Button title="Delete" variant="danger" onPress={() => {}} />,
    );
    expect(getByText('Delete')).toBeTruthy();
  });

  it('shows ActivityIndicator when loading, hides title', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button title="Submit" loading onPress={() => {}} />,
    );
    // Заголовок не виден в loading-состоянии
    expect(queryByText('Submit')).toBeNull();
    // Спиннер присутствует
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Disabled" disabled onPress={onPress} />,
    );
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(
      <Button title="Loading" loading onPress={onPress} />,
    );
    // Нажимаем на TouchableOpacity — disabled=true, поэтому колбэк не вызывается
    const { TouchableOpacity } = require('react-native');
    fireEvent.press(UNSAFE_getByType(TouchableOpacity));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('calls onPress when enabled and pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click me" onPress={onPress} />);
    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when both disabled and loading', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(
      <Button title="Both" disabled loading onPress={onPress} />,
    );
    const { TouchableOpacity } = require('react-native');
    fireEvent.press(UNSAFE_getByType(TouchableOpacity));
    expect(onPress).not.toHaveBeenCalled();
  });
});
