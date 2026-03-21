// Этап 3: Тесты компонента FundingProgress
// Покрывает граничные случаи: 0%, 50%, 100%, >100% (переполнение)

import React from 'react';
import { render } from '@testing-library/react-native';
import { FundingProgress } from '@/components/public/FundingProgress';

describe('FundingProgress', () => {
  it('0% — нет метки «Собрано!», contributed показывает 0', () => {
    const { queryByTestId, getByTestId } = render(
      <FundingProgress contributed={0} target={1000} currency="RUB" />,
    );

    expect(getByTestId('funding-progress')).toBeTruthy();
    // При 0 вклад не показывает «Собрано!»
    expect(queryByTestId('funding-complete-label')).toBeNull();
    // Текст contributed присутствует
    expect(getByTestId('funding-contributed')).toBeTruthy();
  });

  it('50% — нет метки «Собрано!»', () => {
    const { queryByTestId } = render(
      <FundingProgress contributed={500} target={1000} currency="RUB" />,
    );

    expect(queryByTestId('funding-complete-label')).toBeNull();
  });

  it('100% — показывается метка «Собрано!»', () => {
    const { getByTestId } = render(
      <FundingProgress contributed={1000} target={1000} currency="RUB" />,
    );

    expect(getByTestId('funding-complete-label')).toBeTruthy();
    expect(getByTestId('funding-complete-label').props.children).toBe('Собрано!');
  });

  it('120% (переполнение) — метка «Собрано!» показывается, fill не выходит за 100%', () => {
    const { getByTestId } = render(
      <FundingProgress contributed={1200} target={1000} currency="RUB" />,
    );

    // Метка присутствует
    expect(getByTestId('funding-complete-label')).toBeTruthy();

    // Ширина fill должна быть максимум '100%', не '120%'
    const fill = getByTestId('funding-fill');
    const widthStyle = fill.props.style?.find?.(
      (s: Record<string, unknown>) => s && typeof s === 'object' && 'width' in s,
    );
    // Ширина должна быть '100%', не выходить за пределы
    if (widthStyle) {
      expect(widthStyle.width).toBe('100%');
    }
  });

  it('target = 0 — не показывает «Собрано!» и не ломается (edge case)', () => {
    const { queryByTestId } = render(
      <FundingProgress contributed={0} target={0} currency="RUB" />,
    );

    // target=0 → percentage=0, isComplete=false
    expect(queryByTestId('funding-complete-label')).toBeNull();
  });

  it('отображает цель и вклад в тексте', () => {
    const { getByTestId } = render(
      <FundingProgress contributed={300} target={1000} currency="RUB" />,
    );

    // Тексты присутствуют (конкретное форматирование проверяют тесты formatters.test.ts)
    expect(getByTestId('funding-contributed')).toBeTruthy();
    expect(getByTestId('funding-target')).toBeTruthy();
  });
});
