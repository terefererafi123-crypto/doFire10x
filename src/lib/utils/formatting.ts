// Utility functions for formatting values in the Dashboard

/**
 * Formats a number as PLN currency with 2 decimal places
 * @param value - The monetary value to format
 * @returns Formatted string (e.g., "1 350 000,00 zł")
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a number as percentage
 * @param value - The percentage value (0-1 for 0-100%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "2,52%")
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const percentValue = value * 100;
  return new Intl.NumberFormat("pl-PL", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(percentValue / 100);
}

/**
 * Formats an age value with one decimal place
 * @param age - The age value to format
 * @returns Formatted string (e.g., "58,3 lat")
 */
export function formatAge(age: number): string {
  const formatted = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(age);

  return `${formatted} lat`;
}

/**
 * Formats years as "X lat i Y miesięcy"
 * @param years - The number of years (can be fractional)
 * @returns Formatted string (e.g., "22 lat i 4 miesiące")
 */
export function formatYearsAndMonths(years: number): string {
  const fullYears = Math.floor(years);
  const months = Math.round((years - fullYears) * 12);
  
  if (fullYears === 0 && months === 0) {
    return "0 lat";
  }
  
  if (fullYears === 0) {
    return `${months} ${months === 1 ? "miesiąc" : months < 5 ? "miesiące" : "miesięcy"}`;
  }
  
  if (months === 0) {
    return `${fullYears} ${fullYears === 1 ? "rok" : fullYears < 5 ? "lata" : "lat"}`;
  }
  
  const yearsText = fullYears === 1 ? "rok" : fullYears < 5 ? "lata" : "lat";
  const monthsText = months === 1 ? "miesiąc" : months < 5 ? "miesiące" : "miesięcy";
  
  return `${fullYears} ${yearsText} i ${months} ${monthsText}`;
}

