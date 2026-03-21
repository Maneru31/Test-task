import { formatPrice, formatDate, formatRelativeDate } from '@/utils/formatters';

describe('formatPrice', () => {
  it('форматирует рубли: 1500 → «1 500 ₽»', () => {
    const result = formatPrice(1500, 'RUB');
    // Intl.NumberFormat использует неразрывный пробел (\u00a0) как разделитель тысяч
    expect(result.replace(/\u00a0/g, ' ')).toBe('1 500 ₽');
  });

  it('форматирует доллары', () => {
    const result = formatPrice(99.99, 'USD');
    expect(result).toContain('99');
    expect(result).toContain('$');
  });

  it('форматирует евро', () => {
    const result = formatPrice(250, 'EUR');
    expect(result).toContain('250');
    expect(result).toMatch(/€|EUR/);
  });

  it('форматирует ноль', () => {
    const result = formatPrice(0, 'RUB');
    expect(result).toContain('0');
    expect(result).toContain('₽');
  });

  it('RUB по умолчанию', () => {
    const result = formatPrice(100);
    expect(result).toContain('₽');
  });

  it('форматирует большие числа с разделителем тысяч', () => {
    const result = formatPrice(1_000_000, 'RUB');
    // Должны быть разделители тысяч
    expect(result.replace(/\u00a0/g, ' ')).toMatch(/1\s+000\s+000/);
  });

  it('форматирует дробные числа', () => {
    const result = formatPrice(1500.5, 'RUB');
    expect(result).toContain('1');
  });
});

describe('formatDate', () => {
  it('форматирует ISO-строку в читаемую дату', () => {
    const result = formatDate('2024-12-31');
    expect(result).toContain('2024');
    expect(result).toMatch(/декабр/i);
    expect(result).toContain('31');
  });

  it('форматирует объект Date', () => {
    const date = new Date(2024, 0, 15); // 15 января 2024
    const result = formatDate(date);
    expect(result).toContain('2024');
    expect(result).toMatch(/январ/i);
    expect(result).toContain('15');
  });

  it('возвращает строку', () => {
    expect(typeof formatDate('2024-06-01')).toBe('string');
  });
});

describe('formatRelativeDate', () => {
  it('возвращает «Сегодня» для текущей даты', () => {
    const today = new Date().toISOString();
    expect(formatRelativeDate(today)).toBe('Сегодня');
  });

  it('возвращает «Вчера» для вчерашней даты', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelativeDate(yesterday.toISOString())).toBe('Вчера');
  });

  it('возвращает форматированную дату для более старых дат', () => {
    const old = new Date(2023, 5, 1).toISOString();
    const result = formatRelativeDate(old);
    expect(result).toContain('2023');
    expect(result).not.toBe('Сегодня');
    expect(result).not.toBe('Вчера');
  });
});
