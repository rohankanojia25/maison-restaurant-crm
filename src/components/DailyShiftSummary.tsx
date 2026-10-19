import React, { useState, useMemo } from 'react';
import {
  RestaurantProfile,
  RestaurantTable,
  Reservation,
  TableOrder,
  SettledCheckRecord,
} from '../types';
import {
  getTodayDateString,
  getYesterdayDateString,
  getLast7DaysDateStrings,
  formatShiftHeading,
  formatFullDateLabel,
  calculateTurnMinutes,
} from '../utils/date';
import { formatCurrency } from '../utils/currency';
import {
  Calendar,
  Users,
  Clock,
  AlertOctagon,
  Printer,
  Download,
  CheckCircle2,
  TrendingUp,
  Receipt,
  CreditCard,
  QrCode,
  Banknote,
  BookOpen,
  ShieldCheck,
  FileSpreadsheet,
  Landmark,
  X,
} from 'lucide-react';

interface DailyShiftSummaryProps {
  restaurant: RestaurantProfile;
  tables: RestaurantTable[];
  reservations: Reservation[];
  orders: TableOrder[];
  settledChecks?: SettledCheckRecord[];
  onOpenTableOrder?: (orderId: string) => void;
}

type TenderBucketKey = 'upi' | 'card' | 'cash' | 'khata';

interface TenderBucket {
  key: TenderBucketKey;
  label: string;
  shortLabel: string;
  count: number;
  netTotal: number;
  taxTotal: number;
  total: number;
  percentage: number;
  averageTicket: number;
}

export const DailyShiftSummary: React.FC<DailyShiftSummaryProps> = ({
  restaurant,
  reservations,
  orders,
  settledChecks: propSettledChecks,
}) => {
  const todayStr = getTodayDateString();
  const yesterdayStr = getYesterdayDateString();

  // Dynamic selectedDate ('YYYY-MM-DD') and Last 7 Days toggle
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [isLast7Days, setIsLast7Days] = useState<boolean>(false);
  const [shiftFilter, setShiftFilter] = useState<'all' | 'Lunch' | 'Dinner'>('all');
  const [isZReportModalOpen, setIsZReportModalOpen] = useState(false);
  const [csvExportNotice, setCsvExportNotice] = useState<string | null>(null);
  const [zReportBatchNumber] = useState(
    () => `ZR-${getTodayDateString().replace(/-/g, '')}-042`
  );
  const [serviceClosed, setServiceClosed] = useState(false);

  const isTodayActive = !isLast7Days && selectedDate === todayStr;
  const isYesterdayActive = !isLast7Days && selectedDate === yesterdayStr;
  const isCustomDateActive =
    !isLast7Days && selectedDate !== todayStr && selectedDate !== yesterdayStr;

  // Calculate target dates dynamically
  const targetDates = useMemo<string[]>(() => {
    if (isLast7Days) {
      return getLast7DaysDateStrings(todayStr);
    }
    return [selectedDate];
  }, [isLast7Days, selectedDate, todayStr]);

  // Unified settledChecks list (uses centralized store settledChecks, or derives from orders if not passed)
  const allSettledChecks = useMemo<SettledCheckRecord[]>(() => {
    if (propSettledChecks && propSettledChecks.length > 0) {
      return propSettledChecks;
    }
    return orders
      .filter((o) => o.status === 'settled')
      .map((o) => {
        const linkedRes = o.reservationId
          ? reservations.find((r) => r.id === o.reservationId)
          : undefined;
        const seatedAt = o.createdAt || o.settledAt || '';
        const timestamp = o.settledAt || o.updatedAt || o.createdAt;
        const turnMinutes = calculateTurnMinutes(
          o.createdAt,
          timestamp,
          linkedRes?.seatedAt,
          linkedRes?.completedAt
        );
        let shift: 'Lunch' | 'Dinner' = linkedRes?.shift || 'Lunch';
        if (!linkedRes?.shift && timestamp) {
          const dt = new Date(timestamp);
          if (!Number.isNaN(dt.getTime())) {
            const hour = dt.getUTCHours() || dt.getHours();
            shift = hour >= 17 ? 'Dinner' : 'Lunch';
          }
        }
        const serviceChargeAmount = o.serviceChargeAmount || 0;
        const discountAmount = o.discountAmount || 0;
        const netRevenue = Math.max(
          0,
          Math.round((o.subtotal - discountAmount + serviceChargeAmount) * 100) / 100
        );
        return {
          id: `chk-${o.id}`,
          orderId: o.id,
          restaurantId: o.restaurantId,
          tableId: o.tableId,
          tableName: o.tableName,
          guestId: o.guestId || linkedRes?.guestId,
          guestName: o.guestName,
          guestPhone: o.guestPhone || linkedRes?.guestPhone,
          covers: o.partySize || linkedRes?.partySize || 2,
          paymentMethod: o.paymentMethod || 'Card',
          subtotal: o.subtotal,
          cgstAmount: o.cgstAmount ?? Math.round((o.taxAmount / 2) * 100) / 100,
          sgstAmount: o.sgstAmount ?? Math.round((o.taxAmount / 2) * 100) / 100,
          taxAmount: o.taxAmount,
          serviceChargeAmount,
          discountAmount,
          netRevenue,
          grandTotal: o.grandTotal,
          receiptCode: o.receiptCode || o.id.slice(-6).toUpperCase(),
          seatedAt,
          timestamp,
          turnMinutes,
          shift,
          splitBreakdown: o.splitBreakdown,
        };
      });
  }, [propSettledChecks, orders, reservations]);

  // Filter settledChecks for the selected date range, shift, and restaurant
  const filteredChecks = useMemo<SettledCheckRecord[]>(() => {
    return allSettledChecks.filter((chk) => {
      if (chk.restaurantId !== restaurant.id) return false;
      if (shiftFilter !== 'all' && chk.shift !== shiftFilter) return false;
      const checkDate = (chk.timestamp || '').slice(0, 10);
      return targetDates.includes(checkDate);
    });
  }, [allSettledChecks, restaurant.id, shiftFilter, targetDates]);

  // Filter reservations for the selected date range (for no-show/cancellation context)
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (r.restaurantId !== restaurant.id) return false;
      if (shiftFilter !== 'all' && r.shift !== shiftFilter) return false;
      return targetDates.includes(r.date);
    });
  }, [reservations, restaurant.id, targetDates, shiftFilter]);

  // =========================================================================
  // 1. ACCURATE SUMMARY METRICS (Directly from filtered settledChecks)
  // =========================================================================

  // Total Covers: Calculated directly as the sum of guests from all settled checks in the period
  const totalCovers = useMemo(() => {
    return filteredChecks.reduce((sum, chk) => sum + (chk.covers || 2), 0);
  }, [filteredChecks]);

  // Gross Item Subtotal (before service charge & tax)
  const totalSubtotal = useMemo(() => {
    return filteredChecks.reduce((sum, chk) => sum + chk.subtotal, 0);
  }, [filteredChecks]);

  // Total Discounts Given
  const totalDiscountGiven = useMemo(() => {
    return filteredChecks.reduce((sum, chk) => sum + (chk.discountAmount || 0), 0);
  }, [filteredChecks]);

  // Total 5% Service Charge Collected
  const totalServiceCharge = useMemo(() => {
    return filteredChecks.reduce((sum, chk) => sum + (chk.serviceChargeAmount || 0), 0);
  }, [filteredChecks]);

  // Total Net Revenue: Sum of (subtotal + service charge - discount) across settled checks
  const totalNetRevenue = useMemo(() => {
    return filteredChecks.reduce((sum, chk) => {
      const checkNet =
        chk.netRevenue ??
        Math.max(0, chk.subtotal - (chk.discountAmount || 0) + (chk.serviceChargeAmount || 0));
      return sum + checkNet;
    }, 0);
  }, [filteredChecks]);

  // Tax Collected: Total 5% GST collected (with 2.5% CGST & 2.5% SGST breakdown)
  const { totalTaxCollected, totalCgstCollected, totalSgstCollected } = useMemo(() => {
    const cgst = filteredChecks.reduce(
      (sum, chk) => sum + (chk.cgstAmount ?? chk.taxAmount / 2),
      0
    );
    const sgst = filteredChecks.reduce(
      (sum, chk) => sum + (chk.sgstAmount ?? chk.taxAmount / 2),
      0
    );
    const tax = filteredChecks.reduce((sum, chk) => sum + chk.taxAmount, 0);
    return {
      totalTaxCollected: Math.round(tax * 100) / 100,
      totalCgstCollected: Math.round(cgst * 100) / 100,
      totalSgstCollected: Math.round(sgst * 100) / 100,
    };
  }, [filteredChecks]);

  // Total Gross Settled Collections (Net Revenue + 5% GST)
  const totalGrossCollections = useMemo(() => {
    return filteredChecks.reduce((sum, chk) => sum + chk.grandTotal, 0);
  }, [filteredChecks]);

  // Average spend per guest (Cover Average based on Net Revenue)
  const coverAverage = useMemo(() => {
    if (totalCovers === 0) return 0;
    return totalNetRevenue / totalCovers;
  }, [totalNetRevenue, totalCovers]);

  // Table Turn Time: Average duration from table seating time to settlement timestamp
  const { averageTurnMinutes, completedTurnsCount } = useMemo(() => {
    if (filteredChecks.length === 0) {
      return { averageTurnMinutes: 0, completedTurnsCount: 0 };
    }
    const totalDuration = filteredChecks.reduce((sum, chk) => {
      const mins =
        chk.turnMinutes && chk.turnMinutes > 0
          ? chk.turnMinutes
          : calculateTurnMinutes(chk.seatedAt, chk.timestamp);
      return sum + mins;
    }, 0);

    return {
      averageTurnMinutes: Math.round(totalDuration / filteredChecks.length),
      completedTurnsCount: filteredChecks.length,
    };
  }, [filteredChecks]);

  // No-Show & Cancellation Rate (Operational context)
  const { noShowCount, cancelledCount } = useMemo(() => {
    const noShows = filteredReservations.filter((r) => r.status === 'No-Show').length;
    const cancelled = filteredReservations.filter((r) => r.status === 'Cancelled').length;
    return { noShowCount: noShows, cancelledCount: cancelled };
  }, [filteredReservations]);

  // =========================================================================
  // 2. PAYMENT MODE RECONCILIATION (Grouped by UPI / Card / Cash)
  // =========================================================================
  const paymentBreakdown = useMemo<Record<TenderBucketKey, TenderBucket>>(() => {
    const buckets: Record<TenderBucketKey, TenderBucket> = {
      upi: {
        key: 'upi',
        label: 'UPI / Dynamic QR Instant Pay',
        shortLabel: 'UPI / Dynamic QR',
        count: 0,
        netTotal: 0,
        taxTotal: 0,
        total: 0,
        percentage: 0,
        averageTicket: 0,
      },
      card: {
        key: 'card',
        label: 'Credit/Debit Card (Visa, Mastercard, RuPay)',
        shortLabel: 'Credit/Debit Card',
        count: 0,
        netTotal: 0,
        taxTotal: 0,
        total: 0,
        percentage: 0,
        averageTicket: 0,
      },
      cash: {
        key: 'cash',
        label: 'Cash in Register',
        shortLabel: 'Cash in Register',
        count: 0,
        netTotal: 0,
        taxTotal: 0,
        total: 0,
        percentage: 0,
        averageTicket: 0,
      },
      khata: {
        key: 'khata',
        label: 'House Credit (Khata / VIP Ledger)',
        shortLabel: 'House Credit (Khata)',
        count: 0,
        netTotal: 0,
        taxTotal: 0,
        total: 0,
        percentage: 0,
        averageTicket: 0,
      },
    };

    filteredChecks.forEach((chk) => {
      const checkNet =
        chk.netRevenue ??
        Math.max(0, chk.subtotal - (chk.discountAmount || 0) + (chk.serviceChargeAmount || 0));
      const modeStr = String(chk.paymentMethod || 'Card');

      if (modeStr === 'Split' && chk.splitBreakdown) {
        const splitUpi = chk.splitBreakdown.upi || 0;
        const splitCard = chk.splitBreakdown.card || 0;
        const splitCash = chk.splitBreakdown.cash || 0;
        const splitSum = splitUpi + splitCard + splitCash || chk.grandTotal || 1;

        if (splitUpi > 0) {
          const ratio = splitUpi / splitSum;
          buckets.upi.count += 1;
          buckets.upi.total += splitUpi;
          buckets.upi.netTotal += checkNet * ratio;
          buckets.upi.taxTotal += chk.taxAmount * ratio;
        }
        if (splitCard > 0) {
          const ratio = splitCard / splitSum;
          buckets.card.count += 1;
          buckets.card.total += splitCard;
          buckets.card.netTotal += checkNet * ratio;
          buckets.card.taxTotal += chk.taxAmount * ratio;
        }
        if (splitCash > 0) {
          const ratio = splitCash / splitSum;
          buckets.cash.count += 1;
          buckets.cash.total += splitCash;
          buckets.cash.netTotal += checkNet * ratio;
          buckets.cash.taxTotal += chk.taxAmount * ratio;
        }
        return;
      }

      let targetKey: TenderBucketKey = 'card';
      if (modeStr.includes('UPI') || modeStr.includes('QR')) {
        targetKey = 'upi';
      } else if (modeStr === 'Card') {
        targetKey = 'card';
      } else if (modeStr === 'Cash') {
        targetKey = 'cash';
      } else if (modeStr.includes('Credit') || modeStr.includes('Khata')) {
        targetKey = 'khata';
      }

      buckets[targetKey].count += 1;
      buckets[targetKey].total += chk.grandTotal;
      buckets[targetKey].netTotal += checkNet;
      buckets[targetKey].taxTotal += chk.taxAmount;
    });

    (Object.keys(buckets) as TenderBucketKey[]).forEach((k) => {
      const b = buckets[k];
      if (totalGrossCollections > 0) {
        b.percentage = Math.round((b.total / totalGrossCollections) * 1000) / 10;
      }
      if (b.count > 0) {
        b.averageTicket = b.total / b.count;
      }
    });

    return buckets;
  }, [filteredChecks, totalGrossCollections]);

  const formattedDateTitle = useMemo(() => {
    return formatShiftHeading(selectedDate, isLast7Days);
  }, [selectedDate, isLast7Days]);

  // Format seatedAt -> settledAt time range for table display
  const formatTimeShort = (isoStr?: string) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // =========================================================================
  // 3. EXPORT Z-REPORT (CSV & PRINT)
  // =========================================================================
  const handleDownloadZReportCsv = () => {
    const escapeCsv = (val: string | number) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows: Array<Array<string | number>> = [
      ['MAISON HOSPITALITY POS & CRM - END-OF-DAY Z-REPORT & TAX AUDIT'],
      ['Restaurant Outlet', restaurant.name],
      ['Address', restaurant.address || ''],
      ['GSTIN', restaurant.gstin || '27AABCM1234F1Z5'],
      ['FSSAI License', restaurant.fssaiNumber || '11522001000456'],
      ['Audit Batch ID', zReportBatchNumber],
      ['Report Period', formattedDateTitle],
      ['Shift Filter', shiftFilter === 'all' ? 'All Shifts (Lunch & Dinner)' : shiftFilter],
      ['Generated At', new Date().toLocaleString('en-IN')],
      [],
      ['I. EXECUTIVE SUMMARY & TAX AUDIT METRICS'],
      ['Metric', 'Value'],
      ['Total Settled Checks', filteredChecks.length],
      ['Total Covers Served (Guests)', totalCovers],
      ['Average Table Turn Time (Minutes)', `${averageTurnMinutes} mins`],
      ['Gross Food & Beverage Subtotal (INR)', totalSubtotal.toFixed(2)],
      ['Discounts & Comps (INR)', totalDiscountGiven.toFixed(2)],
      ['Service Charge Collected (5%) (INR)', totalServiceCharge.toFixed(2)],
      ['Total Net Revenue (Subtotal + Service Charge) (INR)', totalNetRevenue.toFixed(2)],
      ['CGST Collected (2.5%) (INR)', totalCgstCollected.toFixed(2)],
      ['SGST Collected (2.5%) (INR)', totalSgstCollected.toFixed(2)],
      ['Total 5% GST Collected (INR)', totalTaxCollected.toFixed(2)],
      ['Grand Total Settled Collections (INR)', totalGrossCollections.toFixed(2)],
      ['Net Cover Average per Guest (INR)', coverAverage.toFixed(2)],
      [],
      ['II. PAYMENT MODE RECONCILIATION'],
      [
        'Tender Mode',
        'Settled Checks',
        'Average Check (INR)',
        'Net Revenue (INR)',
        'GST Collected (INR)',
        'Total Settled (INR)',
        'Revenue Share (%)',
      ],
      [
        paymentBreakdown.upi.label,
        paymentBreakdown.upi.count,
        paymentBreakdown.upi.averageTicket.toFixed(2),
        paymentBreakdown.upi.netTotal.toFixed(2),
        paymentBreakdown.upi.taxTotal.toFixed(2),
        paymentBreakdown.upi.total.toFixed(2),
        `${paymentBreakdown.upi.percentage}%`,
      ],
      [
        paymentBreakdown.card.label,
        paymentBreakdown.card.count,
        paymentBreakdown.card.averageTicket.toFixed(2),
        paymentBreakdown.card.netTotal.toFixed(2),
        paymentBreakdown.card.taxTotal.toFixed(2),
        paymentBreakdown.card.total.toFixed(2),
        `${paymentBreakdown.card.percentage}%`,
      ],
      [
        paymentBreakdown.cash.label,
        paymentBreakdown.cash.count,
        paymentBreakdown.cash.averageTicket.toFixed(2),
        paymentBreakdown.cash.netTotal.toFixed(2),
        paymentBreakdown.cash.taxTotal.toFixed(2),
        paymentBreakdown.cash.total.toFixed(2),
        `${paymentBreakdown.cash.percentage}%`,
      ],
    ];

    if (paymentBreakdown.khata.count > 0) {
      rows.push([
        paymentBreakdown.khata.label,
        paymentBreakdown.khata.count,
        paymentBreakdown.khata.averageTicket.toFixed(2),
        paymentBreakdown.khata.netTotal.toFixed(2),
        paymentBreakdown.khata.taxTotal.toFixed(2),
        paymentBreakdown.khata.total.toFixed(2),
        `${paymentBreakdown.khata.percentage}%`,
      ]);
    }

    rows.push(
      [
        'TOTAL SHIFT COLLECTIONS',
        filteredChecks.length,
        filteredChecks.length > 0
          ? (totalGrossCollections / filteredChecks.length).toFixed(2)
          : '0.00',
        totalNetRevenue.toFixed(2),
        totalTaxCollected.toFixed(2),
        totalGrossCollections.toFixed(2),
        filteredChecks.length > 0 ? '100%' : '0%',
      ],
      [],
      ['III. ITEMIZED SETTLED CHECKS AUDIT LEDGER'],
      [
        'Receipt Code',
        'Date',
        'Shift',
        'Table',
        'Guest Name',
        'Covers',
        'Seated At',
        'Settled At',
        'Turn Time (Mins)',
        'Payment Tender',
        'Subtotal (INR)',
        'Service Charge 5% (INR)',
        'Net Revenue (INR)',
        'CGST 2.5% (INR)',
        'SGST 2.5% (INR)',
        'Total GST 5% (INR)',
        'Grand Total (INR)',
      ]
    );

    filteredChecks.forEach((chk) => {
      const checkNet =
        chk.netRevenue ??
        Math.max(0, chk.subtotal - (chk.discountAmount || 0) + (chk.serviceChargeAmount || 0));
      rows.push([
        chk.receiptCode,
        (chk.timestamp || '').slice(0, 10),
        chk.shift,
        `Table ${chk.tableName}`,
        chk.guestName,
        chk.covers,
        formatTimeShort(chk.seatedAt),
        formatTimeShort(chk.timestamp),
        chk.turnMinutes,
        chk.paymentMethod,
        chk.subtotal.toFixed(2),
        (chk.serviceChargeAmount || 0).toFixed(2),
        checkNet.toFixed(2),
        chk.cgstAmount.toFixed(2),
        chk.sgstAmount.toFixed(2),
        chk.taxAmount.toFixed(2),
        chk.grandTotal.toFixed(2),
      ]);
    });

    const csvContent = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateSuffix = isLast7Days ? `Last7Days_${todayStr}` : selectedDate;
    link.href = url;
    link.setAttribute(
      'download',
      `MAISON_Z_Report_${restaurant.slug || 'outlet'}_${dateSuffix}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCsvExportNotice(`Z-Report CSV exported (${filteredChecks.length} settled checks)`);
    setTimeout(() => setCsvExportNotice(null), 4000);
  };

  const handleExportZReportAction = () => {
    handleDownloadZReportCsv();
    setIsZReportModalOpen(true);
  };

  const handlePrintZReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider flex-wrap">
            <span>Financial &amp; Tax Auditing</span>
            <span>•</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Live POS &amp; GST Synced
            </span>
            <span>•</span>
            <span className="text-stone-800 bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200 normal-case font-semibold">
              {formattedDateTitle}
            </span>
          </div>
          <h1 className="text-2xl font-bold font-serif-display text-stone-900 mt-1">
            Daily Service Summary (Z-Report)
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Real-time audit of settled checks, covers, net revenue, 5% GST split (CGST + SGST), table turn times, and tender reconciliation for{' '}
            <strong className="text-stone-900">{restaurant.name}</strong>.
          </p>
        </div>

        {/* Action buttons: Export Z-Report (CSV / Print) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadZReportCsv}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Download CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportZReportAction}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-[#C5A059]" />
            <span>Export Z-Report (CSV / Print)</span>
          </button>
        </div>
      </div>

      {/* CSV Export Banner Notification */}
      {csvExportNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{csvExportNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setCsvExportNotice(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* FILTER & DATE PICKER STRIP */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Quick Date Shortcuts */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-stone-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Period:</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedDate(getTodayDateString());
              setIsLast7Days(false);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isTodayActive
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDate(getYesterdayDateString());
              setIsLast7Days(false);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isYesterdayActive
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLast7Days(true);
              setSelectedDate(getTodayDateString());
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isLast7Days
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            Last 7 Days
          </button>

          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-stone-200">
            <input
              type="date"
              aria-label="Select shift date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  setIsLast7Days(false);
                }
              }}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all focus:outline-none ${
                isCustomDateActive
                  ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                  : 'bg-white border-stone-300 text-stone-800 focus:border-stone-900'
              }`}
            />
            {isCustomDateActive && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                {formatFullDateLabel(selectedDate)}
              </span>
            )}
          </div>
        </div>

        {/* Shift Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-500">Service Shift:</span>
          <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50">
            {(['all', 'Lunch', 'Dinner'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShiftFilter(s)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  shiftFilter === s
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {s === 'all' ? 'All Shifts' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* EXECUTIVE KPI CARDS (4 Core Z-Report Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Covers (Sum of guests from settled checks) */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs relative overflow-hidden hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Covers</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif-display text-stone-900 font-mono-tabular">
              {totalCovers}
            </span>
            <span className="text-xs text-stone-500">guests from settled checks</span>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Settled Checks:</span>
            <span className="font-semibold text-stone-900 font-mono-tabular">
              {filteredChecks.length} bills ({completedTurnsCount} tables)
            </span>
          </div>
        </div>

        {/* Card 2: Total Net Revenue (Subtotal + Service Charge) */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs relative overflow-hidden hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Net Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm">
              ₹
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif-display text-stone-900 font-mono-tabular">
              {formatCurrency(totalNetRevenue)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500 font-mono-tabular">
            Subtotal {formatCurrency(totalSubtotal)} + Service Chg {formatCurrency(totalServiceCharge)}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span className="flex items-center gap-1 text-emerald-800 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Gross (w/ GST):</span>
            </span>
            <span className="font-bold text-stone-900 font-mono-tabular">
              {formatCurrency(totalGrossCollections)}
            </span>
          </div>
        </div>

        {/* Card 3: Tax Collected (5% GST -> 2.5% CGST + 2.5% SGST) */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs relative overflow-hidden hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Tax Collected (5% GST)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-800 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif-display text-stone-900 font-mono-tabular">
              {formatCurrency(totalTaxCollected)}
            </span>
            <span className="text-xs text-stone-500">total GST</span>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600 font-mono-tabular">
            <span>CGST (2.5%): {formatCurrency(totalCgstCollected)}</span>
            <span>SGST (2.5%): {formatCurrency(totalSgstCollected)}</span>
          </div>
        </div>

        {/* Card 4: Table Turn Time (Seating to Settlement timestamp average) */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs relative overflow-hidden hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Table Turn Time</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif-display text-stone-900 font-mono-tabular">
              {averageTurnMinutes}
            </span>
            <span className="text-xs text-stone-500">minutes avg</span>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Seating → Settlement:</span>
            <span className="font-semibold text-stone-800">
              Target {restaurant.slotDurationMinutes || 90} mins
            </span>
          </div>
        </div>
      </div>

      {/* PAYMENT MODE RECONCILIATION & GST TAX AUDIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Dynamic Progress Bar & Tender Share Summary */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900">Payment Mode Distribution</h2>
                <p className="text-[11px] text-stone-500">
                  Dynamic tender share from settled checks
                </p>
              </div>
              <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md font-mono-tabular">
                {filteredChecks.length} checks
              </span>
            </div>

            {/* Dynamic Segmented Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-4 w-full bg-stone-100 rounded-lg overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${paymentBreakdown.upi.percentage}%` }}
                  className="bg-indigo-600 transition-all duration-500"
                  title={`${paymentBreakdown.upi.label}: ${paymentBreakdown.upi.percentage}%`}
                />
                <div
                  style={{ width: `${paymentBreakdown.card.percentage}%` }}
                  className="bg-emerald-600 transition-all duration-500"
                  title={`${paymentBreakdown.card.label}: ${paymentBreakdown.card.percentage}%`}
                />
                <div
                  style={{ width: `${paymentBreakdown.cash.percentage}%` }}
                  className="bg-amber-500 transition-all duration-500"
                  title={`${paymentBreakdown.cash.label}: ${paymentBreakdown.cash.percentage}%`}
                />
                {paymentBreakdown.khata.count > 0 && (
                  <div
                    style={{ width: `${paymentBreakdown.khata.percentage}%` }}
                    className="bg-purple-600 transition-all duration-500"
                    title={`${paymentBreakdown.khata.label}: ${paymentBreakdown.khata.percentage}%`}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                <span>0%</span>
                <span>100% of Settled Collections ({formatCurrency(totalGrossCollections)})</span>
              </div>
            </div>

            {/* Visual Legend Cards */}
            <div className="space-y-2 pt-1">
              {/* 1. UPI / Dynamic QR Instant Pay */}
              <div className="p-2.5 rounded-lg border border-stone-100 bg-[#FAF9F6] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-600 shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-indigo-700" />
                    <span className="text-xs font-semibold text-stone-800">
                      UPI / Dynamic QR Instant Pay
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-stone-900 font-mono-tabular">
                    {formatCurrency(paymentBreakdown.upi.total)}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono-tabular">
                    {paymentBreakdown.upi.percentage}% ({paymentBreakdown.upi.count} checks)
                  </div>
                </div>
              </div>

              {/* 2. Credit/Debit Card (Visa, Mastercard, RuPay) */}
              <div className="p-2.5 rounded-lg border border-stone-100 bg-[#FAF9F6] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-xs font-semibold text-stone-800">
                      Credit/Debit Card (Visa, MC, RuPay)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-stone-900 font-mono-tabular">
                    {formatCurrency(paymentBreakdown.card.total)}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono-tabular">
                    {paymentBreakdown.card.percentage}% ({paymentBreakdown.card.count} checks)
                  </div>
                </div>
              </div>

              {/* 3. Cash in Register */}
              <div className="p-2.5 rounded-lg border border-stone-100 bg-[#FAF9F6] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-amber-700" />
                    <span className="text-xs font-semibold text-stone-800">Cash in Register</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-stone-900 font-mono-tabular">
                    {formatCurrency(paymentBreakdown.cash.total)}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono-tabular">
                    {paymentBreakdown.cash.percentage}% ({paymentBreakdown.cash.count} checks)
                  </div>
                </div>
              </div>

              {paymentBreakdown.khata.count > 0 && (
                <div className="p-2.5 rounded-lg border border-stone-100 bg-[#FAF9F6] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-600 shrink-0" />
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-700" />
                      <span className="text-xs font-semibold text-stone-800">
                        House Credit (Khata)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-stone-900 font-mono-tabular">
                      {formatCurrency(paymentBreakdown.khata.total)}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono-tabular">
                      {paymentBreakdown.khata.percentage}% ({paymentBreakdown.khata.count} checks)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Net Revenue & Cover Avg Summary Box */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-medium">Net Cover Average:</span>
            <span className="font-bold text-stone-900 font-mono-tabular">
              {formatCurrency(coverAverage)} / guest ({totalCovers} covers)
            </span>
          </div>
        </div>

        {/* Right: Payment Breakdown Table & Tax Audit Summary */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="p-5 pb-3 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-stone-900">
                  Payment Mode Reconciliation &amp; Tax Audit
                </h2>
                <p className="text-[11px] text-stone-500">
                  Grouped by actual settled tender with Net Revenue and 5% GST (2.5% CGST + 2.5% SGST)
                </p>
              </div>
              <div className="text-xs font-mono font-medium text-stone-600">
                {formattedDateTitle}
              </div>
            </div>

            {/* Payment Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-[#FAF9F6] text-stone-500 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3">Tender Mode</th>
                    <th className="py-2.5 px-3 text-right">Checks</th>
                    <th className="py-2.5 px-3 text-right">Avg Check</th>
                    <th className="py-2.5 px-3 text-right">Net Revenue</th>
                    <th className="py-2.5 px-3 text-right">5% GST</th>
                    <th className="py-2.5 px-3 text-right">Share</th>
                    <th className="py-2.5 px-3 text-right">Total Settled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {/* UPI / Dynamic QR Instant Pay */}
                  <tr>
                    <td className="py-3 px-3 flex items-center gap-2 font-medium text-stone-900">
                      <QrCode className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>UPI / Dynamic QR Instant Pay</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular">
                      {paymentBreakdown.upi.count}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular">
                      {formatCurrency(paymentBreakdown.upi.averageTicket)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-stone-700">
                      {formatCurrency(paymentBreakdown.upi.netTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-stone-500">
                      {formatCurrency(paymentBreakdown.upi.taxTotal)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 font-mono-tabular">
                        {paymentBreakdown.upi.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900 font-mono-tabular">
                      {formatCurrency(paymentBreakdown.upi.total)}
                    </td>
                  </tr>

                  {/* Credit/Debit Card (Visa, Mastercard, RuPay) */}
                  <tr>
                    <td className="py-3 px-3 flex items-center gap-2 font-medium text-stone-900">
                      <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Credit/Debit Card (Visa, Mastercard, RuPay)</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular">
                      {paymentBreakdown.card.count}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular">
                      {formatCurrency(paymentBreakdown.card.averageTicket)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-stone-700">
                      {formatCurrency(paymentBreakdown.card.netTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-stone-500">
                      {formatCurrency(paymentBreakdown.card.taxTotal)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 font-mono-tabular">
                        {paymentBreakdown.card.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900 font-mono-tabular">
                      {formatCurrency(paymentBreakdown.card.total)}
                    </td>
                  </tr>

                  {/* Cash in Register */}
                  <tr>
                    <td className="py-3 px-3 flex items-center gap-2 font-medium text-stone-900">
                      <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Cash in Register</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular">
                      {paymentBreakdown.cash.count}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular">
                      {formatCurrency(paymentBreakdown.cash.averageTicket)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-stone-700">
                      {formatCurrency(paymentBreakdown.cash.netTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-stone-500">
                      {formatCurrency(paymentBreakdown.cash.taxTotal)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 font-mono-tabular">
                        {paymentBreakdown.cash.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900 font-mono-tabular">
                      {formatCurrency(paymentBreakdown.cash.total)}
                    </td>
                  </tr>

                  {paymentBreakdown.khata.count > 0 && (
                    <tr>
                      <td className="py-3 px-3 flex items-center gap-2 font-medium text-stone-900">
                        <BookOpen className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>House Credit (Khata / VIP Ledger)</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular">
                        {paymentBreakdown.khata.count}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular">
                        {formatCurrency(paymentBreakdown.khata.averageTicket)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular text-stone-700">
                        {formatCurrency(paymentBreakdown.khata.netTotal)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular text-stone-500">
                        {formatCurrency(paymentBreakdown.khata.taxTotal)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 font-mono-tabular">
                          {paymentBreakdown.khata.percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900 font-mono-tabular">
                        {formatCurrency(paymentBreakdown.khata.total)}
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot className="bg-stone-50 font-bold border-t-2 border-stone-200 text-stone-900">
                  <tr>
                    <td className="py-3 px-3">Total Shift Collections</td>
                    <td className="py-3 px-3 text-right font-mono-tabular">
                      {filteredChecks.length}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular">
                      {formatCurrency(
                        filteredChecks.length > 0
                          ? totalGrossCollections / filteredChecks.length
                          : 0
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-emerald-900">
                      {formatCurrency(totalNetRevenue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-indigo-900">
                      {formatCurrency(totalTaxCollected)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular">
                      {filteredChecks.length > 0 ? '100%' : '0%'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-sm text-stone-900">
                      {formatCurrency(totalGrossCollections)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* GST & Net Revenue Audit Breakdown Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-[#FAF9F6] border border-stone-200/80">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  Item Subtotal
                </div>
                <div className="text-sm font-bold text-stone-900 font-mono-tabular mt-0.5">
                  {formatCurrency(totalSubtotal)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF9F6] border border-stone-200/80">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  5% Service Charge
                </div>
                <div className="text-sm font-bold text-stone-900 font-mono-tabular mt-0.5">
                  {formatCurrency(totalServiceCharge)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200/70">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-800">
                  CGST (2.5%) + SGST (2.5%)
                </div>
                <div className="text-xs font-bold text-indigo-950 font-mono-tabular mt-0.5">
                  {formatCurrency(totalCgstCollected)} + {formatCurrency(totalSgstCollected)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/70">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                  Total Net Revenue
                </div>
                <div className="text-sm font-bold text-emerald-950 font-mono-tabular mt-0.5">
                  {formatCurrency(totalNetRevenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom helper footnote */}
          <div className="bg-[#FAF9F6] px-5 py-3 border-t border-stone-200 rounded-b-xl flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                GSTIN: <strong className="text-stone-700 font-mono">{restaurant.gstin || '27AABCM1234F1Z5'}</strong> • 5% GST (2.5% CGST + 2.5% SGST) &amp; 5% Service Charge Audited
              </span>
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              {(noShowCount > 0 || cancelledCount > 0) && (
                <span className="flex items-center gap-1 text-stone-500">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    No-Shows: {noShowCount} · Cancelled: {cancelledCount}
                  </span>
                </span>
              )}
              <span className="font-mono">Batch: {zReportBatchNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SETTLED CHECKS LEDGER TABLE */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-stone-700" />
            <h3 className="text-sm font-bold text-stone-900">
              Settled Checks Ledger — {formattedDateTitle}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-500 font-medium font-mono-tabular">
              {filteredChecks.length} bills settled • {totalCovers} covers
            </span>
            <button
              type="button"
              onClick={handleExportZReportAction}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-stone-700" />
              <span>Export Z-Report (CSV / Print)</span>
            </button>
          </div>
        </div>

        {filteredChecks.length === 0 ? (
          <div className="p-8 text-center text-stone-500 text-xs">
            No settled checks recorded for the selected period ({formattedDateTitle}).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-[#FAF9F6] text-stone-500 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-4">Receipt #</th>
                  <th className="py-2.5 px-4">Table</th>
                  <th className="py-2.5 px-4">Guest</th>
                  <th className="py-2.5 px-4 text-center">Covers</th>
                  <th className="py-2.5 px-4">Seating → Settled</th>
                  <th className="py-2.5 px-4 text-center">Turn Time</th>
                  <th className="py-2.5 px-4">Tender</th>
                  <th className="py-2.5 px-4 text-right">Subtotal</th>
                  <th className="py-2.5 px-4 text-right">Svc Chg (5%)</th>
                  <th className="py-2.5 px-4 text-right">Net Rev</th>
                  <th className="py-2.5 px-4 text-right">5% GST (CGST+SGST)</th>
                  <th className="py-2.5 px-4 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredChecks.map((chk) => {
                  const checkNet =
                    chk.netRevenue ??
                    Math.max(
                      0,
                      chk.subtotal - (chk.discountAmount || 0) + (chk.serviceChargeAmount || 0)
                    );
                  return (
                    <tr key={chk.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-stone-900">
                        {chk.receiptCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-800">
                        Table {chk.tableName}
                      </td>
                      <td className="py-3 px-4 text-stone-900 font-medium">{chk.guestName}</td>
                      <td className="py-3 px-4 text-center font-mono-tabular font-semibold">
                        {chk.covers}
                      </td>
                      <td className="py-3 px-4 text-stone-500 font-mono-tabular text-[11px]">
                        {formatTimeShort(chk.seatedAt)} → {formatTimeShort(chk.timestamp)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-tabular">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/70 text-[11px] font-semibold">
                          {chk.turnMinutes}m
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-800">
                          {chk.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-stone-600">
                        {formatCurrency(chk.subtotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-stone-600">
                        {formatCurrency(chk.serviceChargeAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-emerald-900">
                        {formatCurrency(checkNet)}
                      </td>
                      <td
                        className="py-3 px-4 text-right font-mono-tabular text-stone-500"
                        title={`CGST: ${formatCurrency(chk.cgstAmount)} | SGST: ${formatCurrency(chk.sgstAmount)}`}
                      >
                        {formatCurrency(chk.taxAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono-tabular text-stone-900">
                        {formatCurrency(chk.grandTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Z-REPORT MODAL / PRINTABLE AUDIT SLIP */}
      {isZReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-stone-900" />
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    End-of-Day Shift Z-Report &amp; Tax Audit
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Audit-ready shift summary for CSV export &amp; thermal/accounts print
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsZReportModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRINTABLE RECEIPT CONTAINER (Formatted like real POS slip) */}
            <div
              id="printable-z-report"
              className="bg-[#FAF9F6] border-2 border-dashed border-stone-300 rounded-xl p-6 font-mono text-xs text-stone-800 space-y-4 shadow-inner"
            >
              {/* Slip Header */}
              <div className="text-center space-y-1 pb-3 border-b border-stone-300">
                <h2 className="text-base font-bold tracking-widest text-stone-900 font-serif-display uppercase">
                  {restaurant.name}
                </h2>
                <p className="text-[11px] text-stone-600">{restaurant.address}</p>
                <p className="text-[11px] text-stone-600">
                  Tel: {restaurant.phone || '+91 22 2288 0194'}
                </p>
                <p className="text-[10px] text-stone-500 font-mono">
                  GSTIN: {restaurant.gstin || '27AABCM1234F1Z5'} | FSSAI:{' '}
                  {restaurant.fssaiNumber || '11522001000456'}
                </p>
                <div className="pt-2 text-[11px] font-bold tracking-wider text-stone-900 uppercase">
                  *** DAILY END-OF-DAY Z-REPORT &amp; TAX AUDIT ***
                </div>
              </div>

              {/* Shift Metadata */}
              <div className="grid grid-cols-2 gap-2 text-[11px] py-1 border-b border-stone-200">
                <div>
                  <span className="text-stone-500">Report Batch: </span>
                  <strong className="text-stone-900">{zReportBatchNumber}</strong>
                </div>
                <div className="text-right">
                  <span className="text-stone-500">Shift: </span>
                  <strong className="text-stone-900">
                    {shiftFilter === 'all' ? 'All Shifts' : shiftFilter}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-500">Period: </span>
                  <strong className="text-stone-900">
                    {isLast7Days ? `Last 7 Days (ending ${todayStr})` : selectedDate}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-stone-500">Time: </span>
                  <strong className="text-stone-900">
                    {new Date().toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                </div>
              </div>

              {/* Operational Covers & Turn Metrics */}
              <div className="space-y-1 py-1 border-b border-stone-200">
                <div className="font-bold text-[11px] uppercase tracking-wider text-stone-900">
                  I. OPERATIONAL &amp; TURNOVER METRICS
                </div>
                <div className="flex justify-between">
                  <span>Settled Checks Audited:</span>
                  <strong>{filteredChecks.length} checks</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Covers Served:</span>
                  <strong>{totalCovers} guests</strong>
                </div>
                <div className="flex justify-between">
                  <span>Avg Table Turn Time (Seating → Settled):</span>
                  <strong>{averageTurnMinutes} minutes</strong>
                </div>
                <div className="flex justify-between">
                  <span>No-Show / Cancelled Bookings:</span>
                  <strong>
                    {noShowCount} / {cancelledCount}
                  </strong>
                </div>
              </div>

              {/* Sales Financial & GST Tax Audit Reconciliation */}
              <div className="space-y-1 py-1 border-b border-stone-200">
                <div className="font-bold text-[11px] uppercase tracking-wider text-stone-900">
                  II. REVENUE &amp; 5% GST TAX AUDIT
                </div>
                <div className="flex justify-between">
                  <span>Food &amp; Beverage Subtotal:</span>
                  <span>{formatCurrency(totalSubtotal)}</span>
                </div>
                {totalDiscountGiven > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Less Discounts / Comps:</span>
                    <span>-{formatCurrency(totalDiscountGiven)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Discretionary Service Charge (5%):</span>
                  <span>{formatCurrency(totalServiceCharge)}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-200">
                  <span>TOTAL NET REVENUE (Subtotal + Svc Chg):</span>
                  <span>{formatCurrency(totalNetRevenue)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-600 pt-1">
                  <span>CGST Collected (2.5%):</span>
                  <span>{formatCurrency(totalCgstCollected)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-600">
                  <span>SGST Collected (2.5%):</span>
                  <span>{formatCurrency(totalSgstCollected)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total GST Collected (5%):</span>
                  <span>{formatCurrency(totalTaxCollected)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-stone-900 pt-1 border-t border-stone-300">
                  <span>GRAND TOTAL SETTLED (INCL. GST):</span>
                  <span className="text-emerald-950 font-bold">
                    {formatCurrency(totalGrossCollections)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-600">
                  <span>Net Cover Average / Guest:</span>
                  <span>{formatCurrency(coverAverage)}</span>
                </div>
              </div>

              {/* Tender Breakdown */}
              <div className="space-y-1 py-1 border-b border-stone-200">
                <div className="font-bold text-[11px] uppercase tracking-wider text-stone-900">
                  III. PAYMENT MODE RECONCILIATION
                </div>
                <div className="flex justify-between">
                  <span>UPI / Dynamic QR Instant Pay:</span>
                  <strong>
                    {formatCurrency(paymentBreakdown.upi.total)} ({paymentBreakdown.upi.count} checks · {paymentBreakdown.upi.percentage}%)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Credit/Debit Card (Visa, MC, RuPay):</span>
                  <strong>
                    {formatCurrency(paymentBreakdown.card.total)} ({paymentBreakdown.card.count} checks · {paymentBreakdown.card.percentage}%)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Cash in Register:</span>
                  <strong>
                    {formatCurrency(paymentBreakdown.cash.total)} ({paymentBreakdown.cash.count} checks · {paymentBreakdown.cash.percentage}%)
                  </strong>
                </div>
                {paymentBreakdown.khata.count > 0 && (
                  <div className="flex justify-between">
                    <span>House Credit (Khata):</span>
                    <strong>
                      {formatCurrency(paymentBreakdown.khata.total)} ({paymentBreakdown.khata.count} checks · {paymentBreakdown.khata.percentage}%)
                    </strong>
                  </div>
                )}
              </div>

              {/* Manager Sign-Off Section */}
              <div className="pt-2 space-y-3">
                <div className="text-[10px] text-stone-500 uppercase">
                  Cashier &amp; Duty Manager Sign-off:
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="border-t border-stone-400 pt-1 text-[10px] text-stone-600 text-center">
                    Floor Manager Signature
                  </div>
                  <div className="border-t border-stone-400 pt-1 text-[10px] text-stone-600 text-center">
                    Chief Cashier / Host Signature
                  </div>
                </div>
                <div className="text-center text-[10px] text-stone-400 pt-1">
                  Generated by MAISON Hospitality POS &amp; Audit Engine
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setServiceClosed(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>
                  {serviceClosed
                    ? `Shift Closed (${selectedDate})`
                    : 'Mark Shift Audited & Closed'}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadZReportCsv}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintZReport}
                  className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Z-Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
