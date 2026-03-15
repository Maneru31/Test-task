const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
};

export function formatPrice(
  amount: number | string | null | undefined,
  currency = "RUB"
): string {
  if (amount === null || amount === undefined) return "";

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "";

  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);

  // RUB: "15 000 ₽"; others: "$ 100"
  if (currency === "RUB") return `${formatted} ${symbol}`;
  return `${symbol} ${formatted}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}
