/**
 * Форматирует цену с учётом валюты.
 * Пример: formatPrice(1500, 'RUB') → '1 500 ₽'
 */
export function formatPrice(amount: number, currency: string = 'RUB'): string {
  const formatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

/**
 * Форматирует ISO-дату или Date в читаемый вид.
 * Пример: formatDate('2024-12-31') → '31 декабря 2024 г.'
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Форматирует относительную дату (сегодня/вчера/дата).
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  return formatDate(d);
}
