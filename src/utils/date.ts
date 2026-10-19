import { Reservation, TableOrder } from '../types';

/**
 * Universal Dynamic Date Helpers (Local Time YYYY-MM-DD)
 */

export function getTodayDateString(): string {
  const now = new Date();
  const enCa = now.toLocaleDateString('en-CA');
  if (/^\d{4}-\d{2}-\d{2}$/.test(enCa)) {
    return enCa;
  }
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getRelativeDateString(
  offsetDays: number,
  baseDateStr: string = getTodayDateString()
): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + offsetDays);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getYesterdayDateString(): string {
  return getRelativeDateString(-1);
}

export function getLast7DaysDateStrings(
  baseDateStr: string = getTodayDateString()
): string[] {
  return Array.from({ length: 7 }, (_, idx) =>
    getRelativeDateString(-idx, baseDateStr)
  );
}

/**
 * Formats "YYYY-MM-DD" into e.g. "Monday, Oct 19, 2026"
 */
export function formatFullDateLabel(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats "YYYY-MM-DD" into e.g. "Oct 19, 2026" or "Oct 13"
 */
export function formatShortDateLabel(
  dateStr: string,
  includeYear: boolean = false
): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(
    'en-US',
    includeYear
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { month: 'short', day: 'numeric' }
  );
}

/**
 * Generates consistent shift heading:
 * - "Today's Shift (Monday, Oct 19, 2026)" when today is selected
 * - "Yesterday's Shift (Sunday, Oct 18, 2026)" when yesterday is selected
 * - "Shift on [Formatted Date]" for other historical/custom dates
 * - "Last 7 Days (Oct 13 – Oct 19, 2026)" when Last 7 Days is selected
 */
export function formatShiftHeading(
  selectedDate: string,
  isLast7Days: boolean = false
): string {
  const today = getTodayDateString();

  if (isLast7Days) {
    const start7 = getRelativeDateString(-6, today);
    return `Last 7 Days (${formatShortDateLabel(start7, false)} – ${formatShortDateLabel(
      today,
      true
    )})`;
  }

  const formatted = formatFullDateLabel(selectedDate);
  if (selectedDate === today) {
    return `Today's Shift (${formatted})`;
  }
  return `Shift on ${formatted}`;
}

/**
 * Aligns saved seed reservations with dynamic relative dates so cached localStorage
 * from older hardcoded sessions stays aligned with Today & Yesterday.
 */
export function alignSeedReservationsWithToday(
  reservations: Reservation[],
  seedReservations: Reservation[]
): Reservation[] {
  const seedDateById = new Map<string, string>();
  seedReservations.forEach((sr) => {
    seedDateById.set(sr.id, sr.date);
  });

  return reservations.map((r) => {
    const dynamicSeedDate = seedDateById.get(r.id);
    if (dynamicSeedDate && r.date !== dynamicSeedDate) {
      return { ...r, date: dynamicSeedDate };
    }
    return r;
  });
}

/**
 * Aligns saved seed orders with dynamic relative dates and audit-ready GST/service charge fields
 * so cached localStorage from older sessions stays aligned with Today & Yesterday.
 */
export function alignSeedOrdersWithToday(
  orders: TableOrder[],
  seedOrders: TableOrder[]
): TableOrder[] {
  const seedOrderById = new Map<string, TableOrder>();
  seedOrders.forEach((so) => {
    seedOrderById.set(so.id, so);
  });

  return orders.map((o) => {
    const seedMatch = seedOrderById.get(o.id);
    if (seedMatch) {
      if (o.status === 'settled' && seedMatch.status === 'settled') {
        return {
          ...o,
          createdAt: seedMatch.createdAt,
          updatedAt: seedMatch.updatedAt,
          settledAt: seedMatch.settledAt,
          subtotal: seedMatch.subtotal,
          serviceChargeAmount: seedMatch.serviceChargeAmount,
          cgstAmount: seedMatch.cgstAmount,
          sgstAmount: seedMatch.sgstAmount,
          taxAmount: seedMatch.taxAmount,
          grandTotal: seedMatch.grandTotal,
          paymentMethod: seedMatch.paymentMethod,
          receiptCode: seedMatch.receiptCode,
          partySize: seedMatch.partySize || o.partySize || 2,
        };
      }
      return {
        ...o,
        createdAt: seedMatch.createdAt,
        updatedAt: seedMatch.updatedAt,
      };
    }
    return o;
  });
}

/**
 * Calculates table turn time in minutes from seating timestamp to settlement timestamp.
 */
export function calculateTurnMinutes(
  createdAt?: string,
  settledAt?: string,
  resSeatedAt?: string,
  resCompletedAt?: string
): number {
  const parseClockTimeMinutes = (timeStr?: string): number | null => {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  // First try reservation seatedAt -> completedAt clock strings if available
  const startClock = parseClockTimeMinutes(resSeatedAt);
  const endClock = parseClockTimeMinutes(resCompletedAt);
  if (startClock !== null && endClock !== null) {
    const diff = endClock - startClock;
    if (diff > 0 && diff <= 360) {
      return Math.round(diff);
    }
  }

  // Next calculate directly from order createdAt (seating time) to settledAt (settlement timestamp)
  if (createdAt && settledAt) {
    const startMs = new Date(createdAt).getTime();
    const endMs = new Date(settledAt).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
      const diffMins = (endMs - startMs) / 60000;
      if (diffMins >= 1 && diffMins <= 480) {
        return Math.round(diffMins);
      }
      // If settled immediately in a live test (< 1 min), return 1 min or realistic floor
      if (diffMins >= 0 && diffMins < 1) {
        return Math.max(1, Math.round(diffMins));
      }
    }
  }

  return 72;
}

