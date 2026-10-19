/**
 * Centralized Indian Currency (INR - ₹) Formatter & Utilities
 * Formats monetary amounts according to Indian numbering system (Lakhs, Crores)
 */

export const formatCurrency = (amount: number): string => {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const formatCurrencyDetailed = (amount: number): string => {
  const numericAmount = Number(amount || 0);
  return '₹' + numericAmount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
};

export const parseINRInput = (value: string): number => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
