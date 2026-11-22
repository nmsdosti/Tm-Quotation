import { PricingItem } from '../types/quotation';

/**
 * Formats a number in standard Indian currency format, e.g. ₹1,45,000.00
 */
export function formatINR(amount: number, useRupeeSymbol = true): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return useRupeeSymbol ? `₹${formatted}` : `Rs. ${formatted}`;
}

export function formatINRCompact(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  if (safe >= 10000000) {
    return `₹${(safe / 10000000).toFixed(2)} Cr`;
  }
  if (safe >= 100000) {
    return `₹${(safe / 100000).toFixed(2)} L`;
  }
  return formatINR(safe);
}

/**
 * Rounds currency strictly to 2 decimal places avoiding floating-point drift
 */
export function roundCurrency(value: number): number {
  const safe = Number.isFinite(value) ? value : 0;
  return Math.round((safe + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates Base, GST, and Total for a single commercial pricing row.
 * Never double-counts GST.
 */
export function calculatePricingItem(
  item: Omit<PricingItem, 'baseAmount' | 'gstAmount' | 'totalAmount'>,
  gstEnabled: boolean
): PricingItem {
  const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
  const quantity = Math.max(0, Number(item.quantity) || 0);
  const gstRate = gstEnabled ? Math.min(100, Math.max(0, Number(item.gstRate) || 0)) : 0;

  const baseAmount = roundCurrency(unitPrice * quantity);
  const gstAmount = roundCurrency((baseAmount * gstRate) / 100);
  const totalAmount = roundCurrency(baseAmount + gstAmount);

  return {
    ...item,
    unitPrice,
    quantity,
    gstRate: Math.min(100, Math.max(0, Number(item.gstRate) || 0)),
    baseAmount,
    gstAmount,
    totalAmount,
  };
}

/**
 * Calculates Quotation Summary Totals cleanly from computed line items.
 */
export function calculateQuotationTotals(
  items: PricingItem[],
  gstEnabled: boolean,
  advanceAmount = 0
) {
  const computedItems = items.map((item) => calculatePricingItem(item, gstEnabled));
  const subtotal = roundCurrency(computedItems.reduce((acc, item) => acc + item.baseAmount, 0));
  const totalGst = roundCurrency(computedItems.reduce((acc, item) => acc + item.gstAmount, 0));
  const grandTotal = roundCurrency(subtotal + totalGst);
  const safeAdvance = Math.min(grandTotal, Math.max(0, roundCurrency(Number(advanceAmount) || 0)));
  const balanceAmount = roundCurrency(Math.max(0, grandTotal - safeAdvance));

  return {
    items: computedItems,
    subtotal,
    totalGst,
    grandTotal,
    advanceAmount: safeAdvance,
    balanceAmount,
  };
}

/**
 * Converts a numeric INR amount into Indian English words (Crores, Lakhs, Thousands, Paise).
 */
export function numberToIndianWords(amount: number): string {
  const safe = Math.max(0, roundCurrency(Number.isFinite(amount) ? amount : 0));
  const rupees = Math.floor(safe);
  const paise = Math.round((safe - rupees) * 100);

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const twoDigits = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${o ? ` ${ones[o]}` : ''}`;
  };

  const threeDigits = (n: number): string => {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const hPart = h > 0 ? `${ones[h]} Hundred` : '';
    const rPart = rem > 0 ? twoDigits(rem) : '';
    if (hPart && rPart) return `${hPart} and ${rPart}`;
    return hPart || rPart;
  };

  const convertWhole = (num: number): string => {
    if (num === 0) return 'Zero';
    const parts: string[] = [];

    const crores = Math.floor(num / 10000000);
    const remAfterCrores = num % 10000000;

    const lakhs = Math.floor(remAfterCrores / 100000);
    const remAfterLakhs = remAfterCrores % 100000;

    const thousands = Math.floor(remAfterLakhs / 1000);
    const remainder = remAfterLakhs % 1000;

    if (crores > 0) {
      parts.push(`${crores >= 100 ? convertWhole(crores) : twoDigits(crores)} Crore`);
    }
    if (lakhs > 0) {
      parts.push(`${twoDigits(lakhs)} Lakh`);
    }
    if (thousands > 0) {
      parts.push(`${twoDigits(thousands)} Thousand`);
    }
    if (remainder > 0) {
      parts.push(threeDigits(remainder));
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  };

  const rupeeWords = `Rupees ${convertWhole(rupees)}`;
  if (paise > 0) {
    return `${rupeeWords} and ${twoDigits(paise)} Paise Only`;
  }
  return `${rupeeWords} Only`;
}

export function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return '—';
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTimestampDisplay(date?: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(isoDate: string, days: number): string {
  const base = isoDate ? new Date(`${isoDate}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return getTodayISO();
  base.setDate(base.getDate() + Math.max(0, days));
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildQuotationNumber(prefix: string, financialYear: string, serial: number): string {
  const cleanPrefix = (prefix || 'TMIS').trim().toUpperCase();
  const cleanFY = (financialYear || '2026-27').trim();
  const paddedSerial = String(Math.max(1, Math.floor(serial))).padStart(3, '0');
  return `${cleanPrefix}/${cleanFY}/${paddedSerial}`;
}

/**
 * Generates a Firestore-safe document ID matching ^[a-zA-Z0-9_\-]+$
 */
export function generateSafeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${random}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function truncateString(value: string | undefined | null, maxLen: number): string {
  if (!value) return '';
  const trimmed = String(value);
  return trimmed.length <= maxLen ? trimmed : trimmed.slice(0, maxLen);
}
