import React, { useState } from 'react';
import {
  RestaurantTable,
  MenuItem,
  TableOrder,
  OrderItem,
  MenuCategory,
  Reservation,
  Ingredient,
} from '../types';
import { MENU_CATEGORIES } from '../data/seedData';
import { formatCurrency } from '../utils/currency';
import { evaluateDishStock } from '../utils/inventory';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Send,
  CreditCard,
  Search,
  Clock,
  Users,
  CheckCircle2,
  ChefHat,
  MessageSquare,
  AlertCircle,
  Printer,
} from 'lucide-react';

interface TableOrderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  table: RestaurantTable;
  reservation?: Reservation;
  order: TableOrder;
  menuItems: MenuItem[];
  ingredients?: Ingredient[];
  onUpdateOrder: (updatedOrder: TableOrder) => void;
  onSendToKitchen: (orderId: string) => void;
  onOpenSettleBill: (orderId: string) => void;
  onOpenThermalPrint?: (orderId: string, mode: 'bill' | 'kot') => void;
}

export const TableOrderDrawer: React.FC<TableOrderDrawerProps> = ({
  isOpen,
  onClose,
  table,
  reservation,
  order,
  menuItems,
  ingredients = [],
  onUpdateOrder,
  onSendToKitchen,
  onOpenSettleBill,
  onOpenThermalPrint,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');

  if (!isOpen) return null;

  // Filter menu items
  const filteredMenuItems = menuItems.filter((item) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // Calculate totals helper
  const recalculateOrder = (
    newItems: OrderItem[],
    taxRate = order.taxRate,
    discountType = order.discountType,
    discountValue = order.discountValue
  ): TableOrder => {
    const subtotal = newItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
    let discountAmount = 0;
    if (discountType === 'percent') {
      discountAmount = (subtotal * discountValue) / 100;
    } else if (discountType === 'fixed') {
      discountAmount = Math.min(subtotal, discountValue);
    }
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number((taxableAmount * taxRate).toFixed(2));
    const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));

    return {
      ...order,
      items: newItems,
      taxRate,
      discountType,
      discountValue,
      subtotal,
      discountAmount,
      taxAmount,
      grandTotal,
      updatedAt: new Date().toISOString(),
    };
  };

  // Add item to order
  const handleAddItem = (item: MenuItem) => {
    const stockEval = evaluateDishStock(item, ingredients);
    if (!stockEval.isEffectivelyAvailable) return;
    const existingIndex = order.items.findIndex(
      (it) => it.menuItemId === item.id && !it.sentToKitchen
    );

    let updatedItems: OrderItem[];
    if (existingIndex >= 0) {
      updatedItems = order.items.map((it, idx) =>
        idx === existingIndex ? { ...it, quantity: it.quantity + 1 } : it
      );
    } else {
      const newItem: OrderItem = {
        id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        sentToKitchen: false,
      };
      updatedItems = [...order.items, newItem];
    }

    onUpdateOrder(recalculateOrder(updatedItems));
  };

  // Increase quantity
  const handleIncreaseQty = (orderItemId: string) => {
    const updatedItems = order.items.map((it) =>
      it.id === orderItemId ? { ...it, quantity: it.quantity + 1 } : it
    );
    onUpdateOrder(recalculateOrder(updatedItems));
  };

  // Decrease quantity
  const handleDecreaseQty = (orderItemId: string) => {
    const existing = order.items.find((it) => it.id === orderItemId);
    if (!existing) return;

    let updatedItems: OrderItem[];
    if (existing.quantity <= 1) {
      updatedItems = order.items.filter((it) => it.id !== orderItemId);
    } else {
      updatedItems = order.items.map((it) =>
        it.id === orderItemId ? { ...it, quantity: it.quantity - 1 } : it
      );
    }
    onUpdateOrder(recalculateOrder(updatedItems));
  };

  // Remove item
  const handleRemoveItem = (orderItemId: string) => {
    const updatedItems = order.items.filter((it) => it.id !== orderItemId);
    onUpdateOrder(recalculateOrder(updatedItems));
  };

  // Save item special note
  const handleSaveNote = (orderItemId: string) => {
    const updatedItems = order.items.map((it) =>
      it.id === orderItemId ? { ...it, notes: tempNoteText.trim() || undefined } : it
    );
    onUpdateOrder(recalculateOrder(updatedItems));
    setEditingNoteId(null);
    setTempNoteText('');
  };

  // Change tax rate (5% or 18% GST)
  const handleChangeTaxRate = (rate: number) => {
    onUpdateOrder(recalculateOrder(order.items, rate));
  };

  const unsentCount = order.items.filter((it) => !it.sentToKitchen).length;
  const sentCount = order.items.filter((it) => it.sentToKitchen).length;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-[1px] flex justify-end">
      <div className="bg-[#FAF9F6] border-l border-stone-200 w-full max-w-5xl h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-mono-tabular font-bold text-base">
              {table.name}
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="font-semibold text-stone-900">
                  {table.zone} · Table {table.name}
                </span>
                <span aria-hidden="true">·</span>
                <span>{table.capacity} pax capacity</span>
                {reservation?.seatedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular text-stone-600">
                      Seated at {reservation.seatedAt}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-xl font-semibold text-stone-900 font-serif-display">
                  Active Dine-In Order: {order.guestName || reservation?.guestName || 'Walk-in Table'}
                </h2>
                {reservation?.partySize && (
                  <span className="text-xs font-mono-tabular font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                    {reservation.partySize} covers
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenThermalPrint && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenThermalPrint(order.id, 'kot')}
                  disabled={order.items.length === 0}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 text-xs font-medium rounded-xl border border-stone-200 transition-colors cursor-pointer"
                  title="Print Thermal KOT (58mm / 80mm)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print KOT</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenThermalPrint(order.id, 'bill')}
                  disabled={order.items.length === 0}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 text-xs font-medium rounded-xl border border-stone-200 transition-colors cursor-pointer"
                  title="Print Thermal Bill (58mm / 80mm)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Bill</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onOpenSettleBill(order.id)}
              disabled={order.items.length === 0}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Settle Bill ({formatCurrency(order.grandTotal)})</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close order drawer"
              className="p-2 text-stone-400 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Split: Left Menu Grid + Right Live Bill Summary */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT 7 COLUMNS: FAST MENU CATALOG WITH 1-TAP ITEM ADDITION */}
          <div className="lg:col-span-7 flex flex-col border-r border-stone-200 overflow-hidden bg-white">
            {/* Search & Category Filter */}
            <div className="p-4 border-b border-stone-200 space-y-3 bg-[#FAF9F6]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Fast search menu items to tap &amp; add..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['All', ...MENU_CATEGORIES].map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-stone-900 text-white'
                          : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Items Fast Tap Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredMenuItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-500">
                  No menu items found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredMenuItems.map((item) => {
                    const stockEval = evaluateDishStock(item, ingredients);
                    const isAvailable = stockEval.isEffectivelyAvailable;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleAddItem(item)}
                        className={`p-3 text-left rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                          isAvailable
                            ? 'bg-[#FAF9F6] hover:bg-stone-100 hover:border-stone-400 border-stone-200 active:scale-[0.99]'
                            : 'bg-rose-50/40 border-rose-200 opacity-75 cursor-not-allowed'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-1">
                            <span
                              className={`text-xs font-semibold ${
                                isAvailable ? 'text-stone-900' : 'text-stone-400 line-through'
                              }`}
                            >
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isAvailable && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                                  86 / Sold Out
                                </span>
                              )}
                              <span className="text-xs font-bold font-mono-tabular text-stone-900">
                                {formatCurrency(item.price)}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-stone-500 line-clamp-1">
                            {!isAvailable && stockEval.missingIngredients.length > 0
                              ? `86'd · Out of ${stockEval.missingIngredients.join(', ')}`
                              : item.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              item.dietary === 'Veg'
                                ? 'bg-emerald-50 text-emerald-800'
                                : item.dietary === 'Vegan'
                                ? 'bg-teal-50 text-teal-800'
                                : 'bg-rose-50 text-rose-800'
                            }`}
                          >
                            {item.dietary}
                          </span>

                          <span
                            className={`text-[11px] font-medium flex items-center gap-1 ${
                              isAvailable ? 'text-stone-900' : 'text-rose-700 font-bold'
                            }`}
                          >
                            {isAvailable ? (
                              <>
                                <Plus className="w-3 h-3 text-stone-700" />
                                <span>Add to Order</span>
                              </>
                            ) : (
                              <span>86 / Sold Out</span>
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: CURRENT BILL SUMMARY & KITCHEN TICKET CONTROLS */}
          <div className="lg:col-span-5 flex flex-col bg-[#FAF9F6] overflow-hidden">
            {/* Ticket Header */}
            <div className="px-5 py-3.5 bg-white border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-stone-700" />
                <h3 className="text-sm font-semibold text-stone-900">
                  Current Table Bill ({order.items.length} lines)
                </h3>
              </div>
              <div className="text-xs text-stone-500 font-mono-tabular">
                {unsentCount > 0 ? (
                  <span className="text-amber-700 font-medium">
                    {unsentCount} pending KOT
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium">All KOTs sent</span>
                )}
              </div>
            </div>

            {/* Order Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {order.items.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-stone-200/70 flex items-center justify-center mx-auto text-stone-500">
                    <Plus className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-stone-600">
                    No items on this table yet.
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Tap dishes on the menu to the left to add items to the ticket.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {order.items.map((it) => {
                    const isEditingNote = editingNoteId === it.id;

                    return (
                      <div
                        key={it.id}
                        className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-stone-900">
                                {it.name}
                              </span>
                              {it.sentToKitchen ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-mono-tabular">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  Sent {it.sentAt}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  New
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono-tabular text-stone-500">
                              {formatCurrency(it.price)} each
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold font-mono-tabular text-stone-900">
                              {formatCurrency(it.price * it.quantity)}
                            </span>
                          </div>
                        </div>

                        {/* Quantity controls and notes trigger */}
                        <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                          {/* Notes view / button */}
                          {isEditingNote ? (
                            <div className="flex items-center gap-1.5 flex-1 mr-2">
                              <input
                                type="text"
                                value={tempNoteText}
                                onChange={(e) => setTempNoteText(e.target.value)}
                                placeholder="e.g. Less spicy, dressing on side"
                                className="w-full text-[11px] px-2 py-1 bg-[#FAF9F6] border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-900"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveNote(it.id)}
                                className="px-2 py-1 bg-stone-900 text-white text-[10px] rounded-md font-medium"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(it.id);
                                setTempNoteText(it.notes || '');
                              }}
                              className="text-[11px] text-stone-500 hover:text-stone-900 flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3 text-stone-400" />
                              <span className="italic truncate max-w-[140px]">
                                {it.notes ? it.notes : '+ Add item note'}
                              </span>
                            </button>
                          )}

                          {/* - / + and Trash */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="inline-flex items-center border border-stone-200 rounded-lg bg-[#FAF9F6]">
                              <button
                                type="button"
                                onClick={() => handleDecreaseQty(it.id)}
                                className="p-1 hover:bg-stone-200 text-stone-700 rounded-l-lg transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2.5 text-xs font-mono-tabular font-semibold text-stone-900">
                                {it.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleIncreaseQty(it.id)}
                                className="p-1 hover:bg-stone-200 text-stone-700 rounded-r-lg transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.id)}
                              className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                              title="Delete from ticket"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Calculations & Actions Bottom Tray */}
            <div className="p-5 bg-white border-t border-stone-200 space-y-3.5 shrink-0">
              {/* Configurable Tax Selector (5% vs 18% GST) */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 font-medium">GST Tax Rate</span>
                <div className="inline-flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleChangeTaxRate(0.05)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      order.taxRate === 0.05
                        ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    5% GST (F&amp;B)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeTaxRate(0.18)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      order.taxRate === 0.18
                        ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    18% GST (Liquor/Special)
                  </button>
                </div>
              </div>

              {/* Subtotal, Tax, Grand Total calculation */}
              <div className="space-y-1.5 text-xs border-t border-stone-100 pt-2 font-mono-tabular">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-900">
                    {formatCurrency(order.subtotal)}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600 text-[11px]">
                  <span>CGST ({(order.taxRate * 50).toFixed(1)}%) + SGST ({(order.taxRate * 50).toFixed(1)}%)</span>
                  <span className="font-semibold text-stone-900">
                    {formatCurrency(order.taxAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-stone-100">
                  <span>Grand Total</span>
                  <span className="text-base text-stone-900 font-bold">
                    {formatCurrency(order.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Print KOT / Print Bill + Send to Kitchen & Settle Bill */}
              {onOpenThermalPrint && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenThermalPrint(order.id, 'kot')}
                    disabled={order.items.length === 0}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print KOT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenThermalPrint(order.id, 'bill')}
                    disabled={order.items.length === 0}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Bill</span>
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSendToKitchen(order.id)}
                  disabled={unsentCount === 0}
                  className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[44px] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Send to Kitchen ({unsentCount})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSettleBill(order.id)}
                  disabled={order.items.length === 0}
                  className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs min-h-[44px] cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Settle ({formatCurrency(order.grandTotal)})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
