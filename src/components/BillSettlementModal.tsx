import React, { useState } from 'react';
import {
  RestaurantTable,
  Reservation,
  TableOrder,
  PaymentMode,
  GuestProfile,
  RestaurantProfile,
} from '../types';
import { formatCurrency } from '../utils/currency';
import { TODAY_DATE } from '../data/seedData';
import {
  Check,
  CreditCard,
  QrCode,
  Banknote,
  BookOpen,
  Split,
  X,
  Share2,
  Printer,
  Copy,
  Receipt,
  Star,
  MapPin,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { FeedbackTag, GuestFeedback } from '../types';
import { UpiQrCode, buildUpiIntentUri } from './UpiQrCode';

interface BillSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: TableOrder;
  table: RestaurantTable;
  reservation?: Reservation;
  guest?: GuestProfile;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  restaurantProfile?: RestaurantProfile;
  onConfirmSettlement: (settlementData: {
    orderId: string;
    tableId: string;
    reservationId?: string;
    guestId?: string;
    paymentMethod: PaymentMode;
    subtotal: number;
    discountAmount: number;
    discountType: 'none' | 'percent' | 'fixed';
    discountValue: number;
    taxRate: number;
    cgstAmount: number;
    sgstAmount: number;
    taxAmount: number;
    serviceChargeAmount: number;
    grandTotal: number;
    splitBreakdown?: {
      cash?: number;
      upi?: number;
      card?: number;
    };
    receiptCode: string;
  }) => void;
  onAddFeedback?: (feedback: Omit<GuestFeedback, 'id'>) => void;
  onOpenThermalPrint?: (mode: 'bill' | 'kot') => void;
}

export const BillSettlementModal: React.FC<BillSettlementModalProps> = ({
  isOpen,
  onClose,
  order,
  table,
  reservation,
  guest,
  restaurantName,
  restaurantAddress,
  restaurantPhone,
  restaurantProfile,
  onConfirmSettlement,
  onAddFeedback,
  onOpenThermalPrint,
}) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI (GPay/PhonePe/Paytm)');
  const [upiPaymentVerified, setUpiPaymentVerified] = useState<boolean>(false);
  const [taxRate, setTaxRate] = useState<number>(order.taxRate || restaurantProfile?.taxRate || 0.05);

  // Service charge toggle
  const [applyServiceCharge, setApplyServiceCharge] = useState<boolean>(
    restaurantProfile?.serviceChargeEnabled ?? true
  );
  const [serviceChargeRate, setServiceChargeRate] = useState<number>(
    restaurantProfile?.serviceChargeRate || 0.05 // 5% default
  );

  // Discount state
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Cash tendered state
  const [cashTendered, setCashTendered] = useState<number>(0);

  // Split payment state
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);

  // Receipt Modal State after successful payment
  const [receiptData, setReceiptData] = useState<{
    receiptCode: string;
    date: string;
    time: string;
    tableName: string;
    guestName: string;
    guestPhone?: string;
    items: typeof order.items;
    subtotal: number;
    discountAmount: number;
    serviceChargeAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    taxRate: number;
    taxAmount: number;
    grandTotal: number;
    paymentMode: PaymentMode;
    splitBreakdown?: { cash?: number; upi?: number; card?: number };
    gstin?: string;
    fssaiNumber?: string;
  } | null>(null);

  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Post-Dining Feedback State
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState<number>(0);
  const [feedbackTags, setFeedbackTags] = useState<FeedbackTag[]>(['Food Quality', 'Service']);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  // Real-time calculation in Indian Rupee
  const subtotal = order.items.reduce((acc, it) => acc + it.price * it.quantity, 0);

  let discountAmount = 0;
  if (discountType === 'percent' && discountValue > 0) {
    discountAmount = Math.round(((subtotal * discountValue) / 100) * 100) / 100;
  } else if (discountType === 'fixed' && discountValue > 0) {
    discountAmount = Math.min(subtotal, discountValue);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const serviceChargeAmount = applyServiceCharge ? Math.round(taxableAmount * serviceChargeRate * 100) / 100 : 0;
  
  // Under Indian GST, tax applies on (taxable food + service charge)
  const gstBaseAmount = taxableAmount + serviceChargeAmount;
  const halfRate = taxRate / 2; // e.g., 2.5% CGST + 2.5% SGST = 5%
  const cgstAmount = Math.round(gstBaseAmount * halfRate * 100) / 100;
  const sgstAmount = Math.round(gstBaseAmount * halfRate * 100) / 100;
  const taxAmount = cgstAmount + sgstAmount;
  
  const grandTotal = Math.round((gstBaseAmount + taxAmount) * 100) / 100;

  const changeDue = Math.max(0, cashTendered - grandTotal);
  const totalSplitEntered = (splitCash || 0) + (splitUpi || 0) + (splitCard || 0);
  const splitRemaining = Math.max(0, Math.round((grandTotal - totalSplitEntered) * 100) / 100);

  const gstin = restaurantProfile?.gstin || '07AAAAA0000A1Z5';
  const fssai = restaurantProfile?.fssaiNumber || '10019011000123';
  const upiId = restaurantProfile?.upiId || 'maison.lumiere@okhdfcbank';

  const handleProcessPayment = () => {
    const receiptCode = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

    const settledInfo = {
      orderId: order.id,
      tableId: table.id,
      reservationId: reservation?.id || order.reservationId,
      guestId: guest?.id || reservation?.guestId,
      paymentMethod: paymentMode,
      subtotal,
      discountAmount,
      discountType,
      discountValue,
      taxRate,
      cgstAmount,
      sgstAmount,
      taxAmount,
      serviceChargeAmount,
      grandTotal,
      splitBreakdown: paymentMode === 'Split' ? { cash: splitCash, upi: splitUpi, card: splitCard } : undefined,
      receiptCode,
    };

    onConfirmSettlement(settledInfo);

    setReceiptData({
      receiptCode,
      date: dateStr,
      time: timeStr,
      tableName: table.name,
      guestName: guest?.name || reservation?.guestName || order.guestName || 'Dine-In Guest',
      guestPhone: guest?.phone || reservation?.guestPhone,
      items: order.items,
      subtotal,
      discountAmount,
      serviceChargeAmount,
      cgstAmount,
      sgstAmount,
      taxRate,
      taxAmount,
      grandTotal,
      paymentMode,
      splitBreakdown: paymentMode === 'Split' ? { cash: splitCash, upi: splitUpi, card: splitCard } : undefined,
      gstin,
      fssaiNumber: fssai,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const getWhatsAppReceiptText = () => {
    if (!receiptData) return '';
    const itemsText = receiptData.items
      .map(
        (it) =>
          `• ${it.quantity}x ${it.name} - ${formatCurrency(it.price * it.quantity)}`
      )
      .join('\n');

    return `*${restaurantName} - Tax Invoice / Dining Bill*\nReceipt: ${receiptData.receiptCode}\nGSTIN: ${gstin} | FSSAI: ${fssai}\nDate: ${receiptData.date} at ${receiptData.time}\nTable: ${receiptData.tableName}\nGuest: ${receiptData.guestName}\n\n*Ordered Items:*\n${itemsText}\n\nSubtotal: ${formatCurrency(receiptData.subtotal)}${
      receiptData.discountAmount > 0
        ? `\nDiscount: -${formatCurrency(receiptData.discountAmount)}`
        : ''
    }${
      receiptData.serviceChargeAmount > 0
        ? `\nService Charge (${(serviceChargeRate * 100).toFixed(0)}%): ${formatCurrency(receiptData.serviceChargeAmount)}`
        : ''
    }\nCGST (${(halfRate * 100).toFixed(1)}%): ${formatCurrency(receiptData.cgstAmount)}\nSGST (${(halfRate * 100).toFixed(1)}%): ${formatCurrency(receiptData.sgstAmount)}\n*Total Paid: ${formatCurrency(receiptData.grandTotal)}*\nPayment Method: ${receiptData.paymentMode}\n\nThank you for dining at ${restaurantName}!`;
  };

  const cleanPhone = (receiptData?.guestPhone || '').replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(
    getWhatsAppReceiptText()
  )}`;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
      {receiptData ? (
        /* DIGITAL TAX INVOICE & RECEIPT MODAL */
        <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-6 print:m-0 print:border-none print:shadow-none">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Success icon & header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <p className="text-xs uppercase tracking-widest text-emerald-800 font-semibold font-mono-tabular">
                Payment Settled &amp; Table Vacated
              </p>
              <h2 className="text-2xl font-bold font-serif-display text-stone-900">
                {restaurantName}
              </h2>
              <p className="text-xs text-stone-500">
                {restaurantAddress || 'Lodhi Road, New Delhi'} · {restaurantPhone || '+91 98110 55019'}
              </p>
              <div className="flex items-center justify-center gap-3 text-[11px] font-mono-tabular text-stone-500 pt-1 border-t border-stone-100 max-w-xs mx-auto">
                <span>GSTIN: <strong className="text-stone-800">{gstin}</strong></span>
                <span>·</span>
                <span>FSSAI: <strong className="text-stone-800">{fssai}</strong></span>
              </div>
            </div>

            {/* Receipt Itemized Dossier */}
            <div className="bg-[#FAF9F6] border border-stone-200 rounded-xl p-5 space-y-4 text-xs font-mono-tabular">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 text-stone-600">
                <div>
                  <span className="block text-[11px] text-stone-400">Tax Invoice #</span>
                  <span className="font-semibold text-stone-900">{receiptData.receiptCode}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] text-stone-400">Date &amp; Time</span>
                  <span>{receiptData.date} {receiptData.time}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-stone-200 pb-2 text-stone-600">
                <div>
                  <span className="block text-[11px] text-stone-400">Table</span>
                  <span className="font-semibold text-stone-900">Table {receiptData.tableName}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] text-stone-400">Guest</span>
                  <span className="font-semibold text-stone-900">{receiptData.guestName}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 py-1">
                {receiptData.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-stone-800">
                    <span className="truncate pr-2">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-semibold shrink-0">
                      {formatCurrency(it.price * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Subtotal, Indian GST, Service Charge, Grand Total */}
              <div className="border-t border-stone-200 pt-3 space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(receiptData.subtotal)}</span>
                </div>
                {receiptData.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-{formatCurrency(receiptData.discountAmount)}</span>
                  </div>
                )}
                {receiptData.serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-stone-700">
                    <span>Service Charge ({(serviceChargeRate * 100).toFixed(0)}% Voluntary)</span>
                    <span>{formatCurrency(receiptData.serviceChargeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600 text-[11px]">
                  <span>CGST ({(halfRate * 100).toFixed(1)}%)</span>
                  <span>{formatCurrency(receiptData.cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-stone-600 text-[11px]">
                  <span>SGST ({(halfRate * 100).toFixed(1)}%)</span>
                  <span>{formatCurrency(receiptData.sgstAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
                  <span>Total Amount Paid</span>
                  <span className="text-base text-emerald-900">{formatCurrency(receiptData.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-500 pt-1">
                  <span>Payment Mode</span>
                  <span className="font-semibold text-stone-800">{receiptData.paymentMode}</span>
                </div>
                {receiptData.splitBreakdown && (
                  <div className="p-2 bg-stone-100 rounded-lg text-[10px] space-y-0.5 text-stone-700">
                    <span className="font-semibold block">Split Breakdown:</span>
                    {receiptData.splitBreakdown.upi ? <div>UPI: {formatCurrency(receiptData.splitBreakdown.upi)}</div> : null}
                    {receiptData.splitBreakdown.card ? <div>Card: {formatCurrency(receiptData.splitBreakdown.card)}</div> : null}
                    {receiptData.splitBreakdown.cash ? <div>Cash: {formatCurrency(receiptData.splitBreakdown.cash)}</div> : null}
                  </div>
                )}
              </div>
            </div>

            {/* AUTOMATED POST-DINING FEEDBACK CARD */}
            <div className="bg-[#FAF9F6] border border-stone-200 rounded-xl p-4 space-y-3 print:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Optional: Log Post-Dining Feedback</span>
                </div>
                {feedbackSubmitted ? (
                  <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Feedback Recorded!</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-500">
                    Syncs to Guest CRM &amp; Reviews
                  </span>
                )}
              </div>

              {!feedbackSubmitted ? (
                <div className="space-y-3 pt-1">
                  {/* Interactive 5-Star Selector */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-600 font-medium">Guest Rating:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setFeedbackHoverRating(star)}
                          onMouseLeave={() => setFeedbackHoverRating(0)}
                          onClick={() => setFeedbackRating(star)}
                          className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              (feedbackHoverRating || feedbackRating) >= star
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-stone-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-stone-800 font-mono-tabular ml-2">
                        {feedbackRating}/5
                      </span>
                    </div>
                  </div>

                  {/* Feedback comment input */}
                  <div>
                    <input
                      type="text"
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Guest notes e.g., 'Loved the Galouti Kebab and sommelier pairing'"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onAddFeedback) {
                        onAddFeedback({
                          guestId: guest?.id || reservation?.guestId || 'gst-walkin',
                          guestName: guest?.name || reservation?.guestName || order.guestName || 'Dine-In Guest',
                          guestPhone: guest?.phone || reservation?.guestPhone || order.guestPhone || '+91 98110 55019',
                          rating: feedbackRating,
                          comment: feedbackComment || 'Dinner service feedback logged at settlement.',
                          tags: feedbackTags,
                          date: TODAY_DATE,
                          tableName: table.name,
                          billAmount: grandTotal,
                          status: feedbackRating <= 3 ? 'action_required' : 'resolved',
                        });
                      }
                      setFeedbackSubmitted(true);
                    }}
                    className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold min-h-[40px] transition-colors"
                  >
                    Save Feedback to CRM Dossier
                  </button>
                </div>
              ) : (
                <div className="pt-1">
                  {feedbackRating >= 4 ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1.5">
                      <p className="font-semibold text-emerald-950 text-xs">
                        Guest rated {feedbackRating} Stars! Invite to share on Google Maps:
                      </p>
                      <a
                        href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(
                          `Namaste ${
                            receiptData.guestName.split(' ')[0]
                          }, thank you for dining at ${restaurantName} and rating us ${feedbackRating} stars! Could you take 30 seconds to review us on Google Maps? https://g.page/r/maison-hospitality/review`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Invite to Review on Google Maps via WhatsApp</span>
                      </a>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-900 flex items-center gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="font-medium">
                        Flagged with &ldquo;Manager Follow-up&rdquo; in CRM.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions: Send via WhatsApp & Print & Done */}
            <div className="space-y-3 print:hidden">
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs min-h-[44px]"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send via WhatsApp (+91)</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenThermalPrint) {
                      onOpenThermalPrint('bill');
                    } else {
                      handlePrint();
                    }
                  }}
                  className="px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[44px] cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Thermal Bill (58mm/80mm)</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(getWhatsAppReceiptText()).catch(() => {});
                    setCopiedReceipt(true);
                    setTimeout(() => setCopiedReceipt(false), 2000);
                  }}
                  className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 min-h-[36px]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedReceipt ? 'Copied Bill Text!' : 'Copy Bill Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors min-h-[44px]"
                >
                  Done &amp; Return to Service Board
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* BILL SETTLEMENT MODAL */
        <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-6">
          {/* Header */}
          <div className="px-6 py-4 bg-[#FAF9F6] border-b border-stone-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Receipt className="w-5 h-5 text-stone-800" />
              <div>
                <h3 className="text-lg font-semibold text-stone-900 font-serif-display">
                  Settle Bill — Table {table.name}
                </h3>
                <p className="text-xs text-stone-500">
                  {guest?.name || reservation?.guestName || order.guestName || 'Dine-In Guest'} · {order.items.length} ordered items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {onOpenThermalPrint && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenThermalPrint('kot')}
                    className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Print Thermal KOT (58mm / 80mm)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print KOT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenThermalPrint('bill')}
                    className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Print Thermal Bill (58mm / 80mm)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Bill</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-stone-900 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Bill itemization summary */}
            <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
              <div className="px-4 py-2 bg-[#FAF9F6] border-b border-stone-200 text-stone-500 font-medium flex justify-between">
                <span>Ordered Item</span>
                <span>Amount (INR)</span>
              </div>
              <div className="divide-y divide-stone-100 max-h-40 overflow-y-auto px-4 py-1">
                {order.items.map((it) => (
                  <div key={it.id} className="py-2 flex justify-between font-mono-tabular">
                    <span className="text-stone-800">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-semibold text-stone-900">
                      {formatCurrency(it.price * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Indian GST and Service Charge Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Discount Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Apply Discount
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex items-center p-0.5 bg-stone-100 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType('none');
                        setDiscountValue(0);
                      }}
                      className={`px-2.5 py-1 min-h-[36px] rounded-md transition-colors ${
                        discountType === 'none' ? 'bg-white font-semibold text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`px-2.5 py-1 min-h-[36px] rounded-md transition-colors ${
                        discountType === 'percent' ? 'bg-white font-semibold text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}
                    >
                      % Off
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`px-2.5 py-1 min-h-[36px] rounded-md transition-colors ${
                        discountType === 'fixed' ? 'bg-white font-semibold text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}
                    >
                      ₹ Off
                    </button>
                  </div>

                  {discountType !== 'none' && (
                    <input
                      type="number"
                      min="1"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder={discountType === 'percent' ? '10%' : '₹250'}
                      className="w-24 px-2 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono-tabular focus:outline-none focus:ring-1 focus:ring-stone-900 min-h-[36px]"
                    />
                  )}
                </div>
              </div>

              {/* Indian GST Tax Rate (5% vs 18%) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  GST Rate (CGST + SGST)
                </label>
                <div className="inline-flex items-center p-0.5 bg-stone-100 rounded-lg text-xs w-full">
                  <button
                    type="button"
                    onClick={() => setTaxRate(0.05)}
                    className={`flex-1 py-1.5 min-h-[36px] rounded-md transition-colors text-center ${
                      taxRate === 0.05 ? 'bg-white font-semibold text-stone-900 shadow-2xs' : 'text-stone-600'
                    }`}
                  >
                    5% GST (2.5% + 2.5%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxRate(0.18)}
                    className={`flex-1 py-1.5 min-h-[36px] rounded-md transition-colors text-center ${
                      taxRate === 0.18 ? 'bg-white font-semibold text-stone-900 shadow-2xs' : 'text-stone-600'
                    }`}
                  >
                    18% GST (9% + 9%)
                  </button>
                </div>
              </div>
            </div>

            {/* Service Charge Toggle (Discretionary / Voluntary) */}
            <div className="p-3 bg-[#FAF9F6] border border-stone-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-stone-900">Restaurant Service Charge</span>
                  <span className="px-1.5 py-0.5 text-[10px] bg-stone-200 text-stone-700 rounded-sm font-medium">
                    Discretionary / Voluntary
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Added to bill as discretionary staff gratuity ({Math.round(serviceChargeRate * 100)}%)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {applyServiceCharge && (
                  <select
                    value={serviceChargeRate}
                    onChange={(e) => setServiceChargeRate(Number(e.target.value))}
                    className="text-xs bg-white border border-stone-300 rounded-lg py-1 px-2 font-mono-tabular"
                  >
                    <option value={0.05}>5%</option>
                    <option value={0.08}>8%</option>
                    <option value={0.10}>10%</option>
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setApplyServiceCharge(!applyServiceCharge)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 min-h-[24px] ${
                    applyServiceCharge ? 'bg-emerald-700' : 'bg-stone-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      applyServiceCharge ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Payment Mode Selector - Default Indian Options: Cash, UPI, Card, Split */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700">
                Payment Mode *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { mode: 'UPI (GPay/PhonePe/Paytm)', label: 'UPI / QR', icon: QrCode, badge: 'Popular' },
                  { mode: 'Cash', label: 'Cash', icon: Banknote },
                  { mode: 'Card', label: 'Card (POS)', icon: CreditCard },
                  { mode: 'Split', label: 'Split Bill', icon: Split },
                ].map(({ mode, label, icon: Icon, badge }) => {
                  const active = paymentMode === (mode as PaymentMode);
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode as PaymentMode)}
                      className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1.5 transition-colors min-h-[58px] relative ${
                        active
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-[#FAF9F6] text-stone-700 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {badge && (
                        <span className="absolute -top-1.5 right-2 px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] rounded-full uppercase tracking-wider font-bold">
                          {badge}
                        </span>
                      )}
                      <Icon className="w-4 h-4" />
                      <span className="text-center font-semibold">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1. UPI DYNAMIC QR CODE DISPLAY & PAYMENT VERIFICATION TOGGLE */}
            {paymentMode === 'UPI (GPay/PhonePe/Paytm)' && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-800" />
                    <span className="text-xs font-bold text-emerald-950">Dynamic UPI QR Code</span>
                  </div>
                  <span className="text-[11px] font-mono-tabular font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    Payable: {formatCurrency(grandTotal)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-emerald-200">
                  {/* Dynamic SVG QR Code generated from standard UPI intent */}
                  <UpiQrCode
                    upiId={upiId}
                    payeeName={restaurantName}
                    amount={grandTotal}
                    size={112}
                    transactionNote={`Bill Table ${table.name}`}
                    className="shrink-0"
                  />

                  <div className="space-y-1.5 text-xs flex-1">
                    <p className="font-semibold text-stone-900 font-mono-tabular">
                      VPA: <span className="text-emerald-900 font-bold">{upiId}</span>
                    </p>
                    <p className="text-[11px] text-stone-600">
                      Scan with <strong>Google Pay, PhonePe, or Paytm</strong> to pay exact bill total ({formatCurrency(grandTotal)})
                    </p>
                    <div className="p-1.5 bg-stone-50 border border-stone-200 rounded text-[10px] font-mono text-stone-500 break-all">
                      {buildUpiIntentUri(upiId, restaurantName, grandTotal)}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const upiIntent = buildUpiIntentUri(
                            upiId,
                            restaurantName,
                            grandTotal
                          );
                          navigator.clipboard?.writeText(upiIntent).catch(() => {});
                          setCopiedUpi(true);
                          setTimeout(() => setCopiedUpi(false), 2000);
                        }}
                        className="px-2.5 py-1 text-[11px] bg-emerald-100 text-emerald-900 rounded-md font-semibold hover:bg-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedUpi ? 'Copied UPI Intent' : 'Copy UPI Intent'}</span>
                      </button>
                      {onOpenThermalPrint && (
                        <button
                          type="button"
                          onClick={() => onOpenThermalPrint('bill')}
                          className="px-2.5 py-1 text-[11px] bg-stone-900 text-white rounded-md font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print Bill with QR</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Verification Toggle: "Payment Received via UPI" -> marks table settled and releases table */}
                <div className="p-3 bg-white border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={upiPaymentVerified}
                      onChange={(e) => setUpiPaymentVerified(e.target.checked)}
                      className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">
                        Payment Received via UPI ({formatCurrency(grandTotal)})
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Verify GPay / PhonePe / Paytm confirmation &amp; release Table {table.name}
                      </span>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setUpiPaymentVerified(true);
                      handleProcessPayment();
                    }}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Payment Received via UPI</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. CASH PAYMENT (Cash Tendered & Change Due) */}
            {paymentMode === 'Cash' && (
              <div className="p-4 bg-[#FAF9F6] border border-stone-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-stone-800">
                    Cash Tendered by Guest (₹)
                  </label>
                  <input
                    type="number"
                    step="50"
                    min={grandTotal}
                    value={cashTendered || ''}
                    onChange={(e) => setCashTendered(Number(e.target.value))}
                    placeholder={`e.g. ₹${Math.ceil(grandTotal / 500) * 500}`}
                    className="w-32 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono-tabular focus:outline-none focus:ring-1 focus:ring-stone-900 min-h-[38px] text-right"
                  />
                </div>

                {/* Quick Cash Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-500">Quick tender:</span>
                  <button
                    type="button"
                    onClick={() => setCashTendered(grandTotal)}
                    className="px-2 py-1 text-[11px] bg-white border border-stone-200 rounded-md font-mono-tabular hover:bg-stone-100"
                  >
                    Exact ({formatCurrency(grandTotal)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashTendered(Math.ceil(grandTotal / 100) * 100)}
                    className="px-2 py-1 text-[11px] bg-white border border-stone-200 rounded-md font-mono-tabular hover:bg-stone-100"
                  >
                    {formatCurrency(Math.ceil(grandTotal / 100) * 100)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashTendered(Math.ceil(grandTotal / 500) * 500)}
                    className="px-2 py-1 text-[11px] bg-white border border-stone-200 rounded-md font-mono-tabular hover:bg-stone-100"
                  >
                    {formatCurrency(Math.ceil(grandTotal / 500) * 500)}
                  </button>
                </div>

                {cashTendered > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-stone-200 font-mono-tabular">
                    <span className="text-stone-600 font-medium">Change Return to Guest:</span>
                    <span className="font-bold text-stone-900 text-sm text-emerald-800">
                      {formatCurrency(changeDue)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 3. SPLIT BILL OPTION */}
            {paymentMode === 'Split' && (
              <div className="p-4 bg-[#FAF9F6] border border-stone-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <span className="font-semibold text-stone-900">Custom Split Breakdown</span>
                  <span
                    className={`font-mono-tabular font-bold ${
                      splitRemaining === 0 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {splitRemaining === 0 ? '✓ Balanced' : `Remaining: ${formatCurrency(splitRemaining)}`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1">UPI (₹)</label>
                    <input
                      type="number"
                      value={splitUpi || ''}
                      onChange={(e) => setSplitUpi(Number(e.target.value))}
                      placeholder="₹0"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1">Card (₹)</label>
                    <input
                      type="number"
                      value={splitCard || ''}
                      onChange={(e) => setSplitCard(Number(e.target.value))}
                      placeholder="₹0"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-600 mb-1">Cash (₹)</label>
                    <input
                      type="number"
                      value={splitCash || ''}
                      onChange={(e) => setSplitCash(Number(e.target.value))}
                      placeholder="₹0"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono-tabular"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Final Financial Totals Breakdown in INR */}
            <div className="bg-[#FAF9F6] border border-stone-200 rounded-xl p-4 space-y-2 text-xs font-mono-tabular">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal ({order.items.reduce((s, it) => s + it.quantity, 0)} items)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    Discount ({discountType === 'percent' ? `${discountValue}%` : 'Fixed'})
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {serviceChargeAmount > 0 && (
                <div className="flex justify-between text-stone-700">
                  <span>Service Charge ({(serviceChargeRate * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(serviceChargeAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600 text-[11px]">
                <span>CGST ({(halfRate * 100).toFixed(1)}%)</span>
                <span>{formatCurrency(cgstAmount)}</span>
              </div>
              <div className="flex justify-between text-stone-600 text-[11px]">
                <span>SGST ({(halfRate * 100).toFixed(1)}%)</span>
                <span>{formatCurrency(sgstAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Total Amount Due</span>
                <span className="text-lg text-stone-950 font-bold">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition-colors min-h-[44px]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleProcessPayment}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm min-h-[44px] active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Settlement ({formatCurrency(grandTotal)})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
