/**
 * Indian Phone Number (+91) Formatting & Validation Utilities
 */

export const DEFAULT_COUNTRY_CODE = '+91';

/**
 * Extracts the 10-digit Indian mobile number from any string input
 */
export const getCleanIndianPhoneDigits = (input: string): string => {
  let cleaned = input.replace(/[^0-9]/g, '');
  // If user entered 91 followed by 10 digits, strip the leading 91
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned.slice(0, 10);
};

/**
 * Formats 10 digits into Indian phone format: "+91 98110 55019"
 */
export const formatIndianPhone = (raw: string): string => {
  if (!raw) return '';
  const digits = getCleanIndianPhoneDigits(raw);
  if (!digits) return '';
  if (digits.length <= 5) {
    return `+91 ${digits}`;
  }
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
};

/**
 * Validates whether the string is a valid 10-digit Indian mobile number
 * Indian mobiles start with 6, 7, 8, or 9
 */
export const isValidIndianPhone = (input: string): boolean => {
  const digits = getCleanIndianPhoneDigits(input);
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
};
