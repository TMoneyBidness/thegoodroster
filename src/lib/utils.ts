/**
 * Shared utility functions.
 */

/** Format a number as USD currency */
export function formatCurrency(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  }).format(value);
}

/** Format a number as percentage */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Format a number with commas */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
