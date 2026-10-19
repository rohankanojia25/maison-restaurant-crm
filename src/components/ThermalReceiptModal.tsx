import React, { useState, useEffect } from 'react';
import {
  RestaurantProfile,
  RestaurantTable,
  Reservation,
  TableOrder,
  GuestProfile,
} from '../types';
import { formatCurrency } from '../utils/currency';
import { UpiQrCode, buildUpiIntentUri } from './UpiQrCode';
import {
  Printer,
  X,
  Check,
  Receipt,
  ChefHat,
  QrCode,
  Copy,
  CheckCircle2,
} from 'lucide-react';

export type ThermalPrintMode = 'bill' | 'kot';
export type ThermalPaperWidth = '80mm' | '58mm';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: ThermalPrintMode;
  restaurant: RestaurantProfile;
  table: RestaurantTable;
  order: TableOrder;
  reservation?: Reservation;
  guest?: GuestProfile;
  stewardName?: string;
  customBillingOverrides?: {
    subtotal: number;
    discountAmount: number;
    serviceChargeAmount: number;
    serviceChargeRate: number;
    cgstAmount: number;
    sgstAmount: number;
    taxRate: number;
    grandTotal: number;
    receiptCode?: string;
    paymentMode?: string;
  };
  onVerifyUpiSettlement?: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'bill',
  restaurant,
  table,
  order,
  reservation,
  guest,
  stewardName,
  customBillingOverrides,
  onVerifyUpiSettlement,
}) => {
  const [printMode, setPrintMode] = useState<ThermalPrintMode>(initialMode);
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>('80mm');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiVerifiedChecked, setUpiVerifiedChecked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPrintMode(initialMode);
      setUpiVerifiedChecked(order.status === 'settled');
    }
  }, [isOpen, initialMode, order.status]);

  if (!isOpen) return null;

  // Compute financial breakdown (use custom overrides from Settlement drawer if provided, else compute from order)
  const subtotal =
    customBillingOverrides?.subtotal ??
    order.items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const discountAmount =
    customBillingOverrides?.discountAmount ?? (order.discountAmount || 0);

  const taxableFood = Math.max(0, subtotal - discountAmount);
  const serviceChargeRate =
    customBillingOverrides?.serviceChargeRate ??
    (restaurant.serviceChargeEnabled ? restaurant.serviceChargeRate || 0.05 : 0);

  const serviceChargeAmount =
    customBillingOverrides?.serviceChargeAmount ??
    (restaurant.serviceChargeEnabled
      ? Math.round(taxableFood * serviceChargeRate * 100) / 100
      : 0);

  const taxRate = customBillingOverrides?.taxRate ?? (order.taxRate || 0.05);
  const halfRatePct = (taxRate * 100) / 2; // 2.5% for 5% GST, 9.0% for 18% GST
  const gstBase = taxableFood + serviceChargeAmount;

  const cgstAmount =
    customBillingOverrides?.cgstAmount ??
    Math.round(gstBase * (taxRate / 2) * 100) / 100;
  const sgstAmount =
    customBillingOverrides?.sgstAmount ??
    Math.round(gstBase * (taxRate / 2) * 100) / 100;
  const grandTotal =
    customBillingOverrides?.grandTotal ??
    Math.round((gstBase + cgstAmount + sgstAmount) * 100) / 100;

  const invoiceNumber =
    customBillingOverrides?.receiptCode ||
    order.receiptCode ||
    `INV-${order.id.slice(-5).toUpperCase()}`;

  const kotNumber = `KOT #${100 + Math.max(1, order.kotCount || 1)}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const activeSteward =
    stewardName || order.waiterName || 'Antoine Dupuis';
  const coversCount =
    reservation?.partySize || order.partySize || table.capacity || 2;
  const guestDisplay =
    guest?.name || reservation?.guestName || order.guestName || 'Walk-in Guest';

  const gstin = restaurant.gstin || '07AABCM1234F1Z5';
  const fssai = restaurant.fssaiNumber || '10019011000452';
  const upiId = restaurant.upiId || 'restaurant@upi';
  const upiIntent = buildUpiIntentUri(
    upiId,
    restaurant.name || 'MaisonRestaurant',
    grandTotal,
    `Table ${table.name} ${invoiceNumber}`
  );

  const dividerLine =
    paperWidth === '80mm'
      ? '------------------------------------------'
      : '--------------------------------';

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:static print:bg-white print:p-0 print:block">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-4 print:border-none print:shadow-none print:rounded-none print:max-w-none print:m-0">
        {/* TOP SCREEN CONTROLS BAR (Hidden when printing) */}
        <div className="px-5 py-3.5 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold">
                Thermal POS Printer Preview ({paperWidth})
              </h3>
              <p className="text-[11px] text-stone-400">
                Table {table.name} · Indian GST Tax Invoice &amp; Kitchen Ticket
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close thermal preview"
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODE & PAPER WIDTH TOOLBAR (Hidden when printing) */}
        <div className="px-5 py-3 bg-[#FAF9F6] border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          {/* Mode Switcher: Print Bill vs Print KOT */}
          <div className="inline-flex items-center p-1 bg-stone-200/80 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setPrintMode('bill')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                printMode === 'bill'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Customer Bill (GST)</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('kot')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                printMode === 'kot'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Kitchen KOT Slip</span>
            </button>
          </div>

          {/* Paper Width Switcher: 80mm vs 58mm */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-stone-500">
              Roll Width:
            </span>
            <div className="inline-flex items-center p-1 bg-stone-200/80 rounded-xl text-xs font-mono-tabular">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  paperWidth === '80mm'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                80mm (POS)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  paperWidth === '58mm'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                58mm (Compact)
              </button>
            </div>
          </div>
        </div>

        {/* SCROLLABLE RECEIPT PREVIEW CONTAINER */}
        <div className="p-5 sm:p-6 bg-stone-100/80 flex justify-center max-h-[68vh] overflow-y-auto print:p-0 print:bg-white print:max-h-none print:overflow-visible">
          {/* ACTUAL THERMAL RECEIPT PAPER (@media print target) */}
          <div
            id="thermal-print-receipt"
            data-paper-width={paperWidth}
            className={`bg-white text-black font-mono-tabular border border-stone-300 shadow-md px-4 py-5 transition-all print:border-none print:shadow-none print:mx-auto ${
              paperWidth === '80mm'
                ? 'w-[310px] sm:w-[330px] text-[11px] leading-[1.45]'
                : 'w-[225px] sm:w-[235px] text-[10px] leading-[1.35]'
            }`}
          >
            {printMode === 'bill' ? (
              /* ========================================================= */
              /* 1. CUSTOMER TAX INVOICE / THERMAL BILL                    */
              /* ========================================================= */
              <div>
                {/* Centered Restaurant Header */}
                <div className="text-center space-y-0.5">
                  <div className="text-sm font-bold uppercase tracking-wide">
                    {restaurant.name}
                  </div>
                  <div className="text-[10px] leading-snug">
                    {restaurant.address ||
                      '742 Evergreen Terrace, Lodhi Road, New Delhi'}
                  </div>
                  <div className="text-[10px]">
                    Tel: {restaurant.phone || '+91 11 4123 5588'}
                  </div>
                  <div className="text-[10px] font-semibold pt-0.5">
                    GSTIN: {gstin}
                  </div>
                  <div className="text-[10px]">FSSAI Lic No: {fssai}</div>
                  <div className="pt-1 font-bold uppercase tracking-widest text-[10px]">
                    TAX INVOICE
                  </div>
                </div>

                <div className="my-1.5 text-center overflow-hidden whitespace-nowrap select-none">
                  {dividerLine}
                </div>

                {/* Metadata Block */}
                <div className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>Date: {dateStr}</span>
                    <span>Time: {timeStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Invoice: {invoiceNumber}</span>
                    <span className="font-bold">Table: {table.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="truncate pr-1">Steward: {activeSteward}</span>
                    <span>Covers: {coversCount}</span>
                  </div>
                  <div className="truncate">Guest: {guestDisplay}</div>
                </div>

                <div className="my-1.5 text-center overflow-hidden whitespace-nowrap select-none">
                  {dividerLine}
                </div>

                {/* Tabular Item Header */}
                <div className="grid grid-cols-12 font-bold pb-0.5">
                  <span className="col-span-6">Item Name</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>

                <div className="my-1 text-center overflow-hidden whitespace-nowrap select-none">
                  {dividerLine}
                </div>

                {/* Item Rows */}
                <div className="space-y-1">
                  {order.items.length === 0 ? (
                    <div className="text-center py-2 italic">
                      No items on bill
                    </div>
                  ) : (
                    order.items.map((it) => (
                      <div key={it.id} className="grid grid-cols-12 items-start">
                        <span className="col-span-6 pr-1 break-words">
                          {it.name}
                        </span>
                        <span className="col-span-2 text-center">
                          {it.quantity}
                        </span>
                        <span className="col-span-2 text-right">
                          {it.price}
                        </span>
                        <span className="col-span-2 text-right font-semibold">
                          {(it.price * it.quantity).toFixed(0)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="my-1.5 text-center overflow-hidden whitespace-nowrap select-none">
                  {dividerLine}
                </div>

                {/* Subtotal, Taxes, Service Charge & Grand Total */}
                <div className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>
                      Subtotal (
                      {order.items.reduce((acc, i) => acc + i.quantity, 0)} qty)
                    </span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between font-semibold">
                      <span>Discount Applied</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  {serviceChargeAmount > 0 && (
                    <div className="flex justify-between">
                      <span>
                        Service Charge ({(serviceChargeRate * 100).toFixed(0)}%)
                      </span>
                      <span>{formatCurrency(serviceChargeAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>CGST ({halfRatePct.toFixed(1)}%)</span>
                    <span>{formatCurrency(cgstAmount)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>SGST ({halfRatePct.toFixed(1)}%)</span>
                    <span>{formatCurrency(sgstAmount)}</span>
                  </div>
                </div>

                <div className="my-1.5 text-center overflow-hidden whitespace-nowrap select-none">
                  {dividerLine}
                </div>

                {/* BOLD GRAND TOTAL */}
                <div className="flex justify-between items-baseline text-sm font-bold py-0.5">
                  <span>GRAND TOTAL</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>

                {/* Total Savings Line if discount applied */}
                {discountAmount > 0 && (
                  <div className="text-center text-[10px] font-bold py-0.5 border-t border-dashed border-black mt-1">
                    *** TOTAL SAVINGS: {formatCurrency(discountAmount)} ***
                  </div>
                )}

                <div className="my-1.5 text-center overflow-hidden whitespace-nowrap select-none">
                  {dividerLine}
                </div>

                {/* ON-BILL DYNAMIC UPI QR CODE */}
                <div className="text-center space-y-1.5 py-1">
                  <div className="font-bold uppercase text-[10px]">
                    Scan &amp; Pay via UPI (GPay / PhonePe / Paytm)
                  </div>
                  <div className="flex justify-center">
                    <UpiQrCode
                      upiId={upiId}
                      payeeName={restaurant.name}
                      amount={grandTotal}
                      size={paperWidth === '80mm' ? 116 : 96}
                      transactionNote={`Table ${table.name}`}
                    />
                  </div>
                  <div className="text-[9px] font-semibold">
                    UPI ID: {upiId}
                  </div>
                  <div className="text-[9px] font-bold">
                    Exact Bill Amount: {formatCurrency(grandTotal)}
                  </div>
                </div>

                <div className="my-1.5 text-center overflow-hidden whitespace-nowrap select-none">
                  {dividerLine}
                </div>

                {/* Footer Message */}
                <div className="text-center space-y-0.5 pt-0.5">
                  <div className="font-bold">
                    Thank you for dining with us! Visit again.
                  </div>
                  <div className="text-[9px]">
                    Inclusive of applicable taxes · E.&amp;O.E.
                  </div>
                </div>
              </div>
            ) : (
              /* ========================================================= */
              /* 2. KITCHEN ORDER TICKET (KOT) THERMAL SLIP                */
              /* ========================================================= */
              <div>
                <div className="text-center space-y-0.5">
                  <div className="text-xs font-bold uppercase tracking-wider">
                    *** KITCHEN ORDER TICKET ***
                  </div>
                  <div className="text-[10px] font-semibold">
                    {restaurant.name}
                  </div>
                </div>

                <div className="my-1.5 text-center overflow-hidden whitespace-nowrap select-none">
                  {dividerLine}
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between font-bold text-xs">
                    <span>TABLE: {table.name}</span>
                    <span>{kotNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date: {dateStr}</span>
                    <span>Time: {timeStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Steward: {activeSteward}</span>
                    <span>Covers: {coversCount}</span>
                  </div>
                  <div>Zone: {table.zone}</div>
                </div>

                <div className="my-1.5 text-center overflow-hidden whitespace-nowrap select-none">
                  {dividerLine}
                </div>

                <div className="grid grid-cols-12 font-bold pb-0.5">
                  <span className="col-span-3">QTY</span>
                  <span className="col-span-9">DISH / MODIFIERS</span>
                </div>

                <div className="my-1 text-center overflow-hidden whitespace-nowrap select-none">
                  {dividerLine}
                </div>

                <div className="space-y-2 py-1">
                  {order.items.length === 0 ? (
                    <div className="text-center py-2 italic">
                      No items in order
                    </div>
                  ) : (
                    order.items.map((it) => (
                      <div key={it.id} className="space-y-0.5">
                        <div className="grid grid-cols-12 font-bold text-xs">
                          <span className="col-span-3">{it.quantity}x</span>
                          <span className="col-span-9 break-words">
                            {it.name}
                          </span>
                        </div>
                        {it.notes && (
                          <div className="pl-6 text-[10px] font-bold uppercase">
                            &gt;&gt; NOTE: {it.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="my-1.5 text-center overflow-hidden whitespace-nowrap select-none">
                  {dividerLine}
                </div>

                <div className="text-center text-[10px] font-bold">
                  TOTAL ITEMS: {order.items.reduce((a, b) => a + b.quantity, 0)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTION FOOTER & UPI VERIFICATION TOGGLE (Hidden when printing) */}
        <div className="px-5 py-4 bg-white border-t border-stone-200 space-y-3 print:hidden">
          {/* UPI Intent & Payment Verification Strip (When in Bill Mode) */}
          {printMode === 'bill' && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                  <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                  <span>UPI Intent Spec Ready ({formatCurrency(grandTotal)})</span>
                </div>
                <div className="text-[10px] font-mono text-emerald-800 break-all">
                  {upiIntent}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(upiIntent).catch(() => {});
                    setCopiedUpi(true);
                    setTimeout(() => setCopiedUpi(false), 2000);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedUpi ? 'Copied!' : 'Copy UPI URI'}</span>
                </button>

                {onVerifyUpiSettlement && order.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => {
                      setUpiVerifiedChecked(true);
                      onVerifyUpiSettlement();
                    }}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Payment Received via UPI</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bottom Print & Close Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
            >
              Close Preview
            </button>

            <button
              type="button"
              onClick={handleTriggerPrint}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>
                {printMode === 'bill'
                  ? `Print ${paperWidth} Bill`
                  : `Print ${paperWidth} KOT`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
