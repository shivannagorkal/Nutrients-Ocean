/**
 * Format number into Indian Rupee currency format (e.g., ₹1,23,456.00 or ₹1,23,456)
 */
export function formatRupee(amount: number | string | null | undefined, { showDecimals = true }: { showDecimals?: boolean } = {}): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0.00';
  }
  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const parts = absNum.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian currency formatting: last 3 digits, then groups of 2
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  const result = showDecimals ? `₹${formattedInteger}.${decimalPart}` : `₹${formattedInteger}`;
  return isNegative ? `-${result}` : result;
}

/**
 * Format IST Date YYYY-MM-DD
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Format Percentage
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

