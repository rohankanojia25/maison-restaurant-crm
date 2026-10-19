import React, { useState, useMemo, useEffect } from 'react';
import {
  RestaurantTable,
  MenuItem,
  TableOrder,
  OrderItem,
  Reservation,
  StaffAccount,
  TableZone,
  MenuCategory,
  KitchenTicket,
  DietaryType,
  Ingredient,
} from '../types';
import { MENU_CATEGORIES } from '../data/seedData';
import { formatCurrency } from '../utils/currency';
import { evaluateDishStock } from '../utils/inventory';
import {
  Search,
  Users,
  Clock,
  Plus,
  Minus,
  Trash2,
  Send,
  Receipt,
  X,
  ChefHat,
  CheckCircle2,
  AlertCircle,
  Bell,
  UtensilsCrossed,
  Layers,
  ChevronLeft,
  MessageSquare,
  Sparkles,
  UserCheck,
  Check,
  CreditCard,
  SlidersHorizontal,
  Printer,
} from 'lucide-react';

interface WaiterOrderPadProps {
  restaurantId: string;
  restaurantName: string;
  tables: RestaurantTable[];
  menuItems: MenuItem[];
  ingredients?: Ingredient[];
  orders: TableOrder[];
  reservations: Reservation[];
  staffAccounts: StaffAccount[];
  kitchenTickets: KitchenTicket[];
  activeWaiterName: string;
  onChangeWaiterName: (name: string) => void;
  onUpdateTableOrder: (order: TableOrder) => void;
  onSendKOT: (kot: KitchenTicket, updatedOrder: TableOrder) => void;
  onUpdateTableStatus: (tableId: string, status: 'Free' | 'Seated' | 'Bill Requested') => void;
  onOpenSettleBillModal: (tableId: string) => void;
  onOpenQuickSeatModal?: (tableId: string) => void;
  onOpenThermalPrint?: (orderId: string, mode: 'bill' | 'kot') => void;
  onOpenAiMenuImport?: () => void;
  onNavigateToHostBoard: () => void;
  onNavigateToKitchen: () => void;
}

const COMMON_NOTES = [
  'Less spicy',
  'No onion/garlic',
  'Serve starter first',
  'Extra crispy',
  'Jain preparation',
  'Allergy warning',
  'Sauce on side',
  'Warm plates',
];

export const WaiterOrderPad: React.FC<WaiterOrderPadProps> = ({
  restaurantId,
  restaurantName,
  tables,
  menuItems,
  ingredients = [],
  orders,
  reservations,
  staffAccounts,
  kitchenTickets,
  activeWaiterName,
  onChangeWaiterName,
  onUpdateTableOrder,
  onSendKOT,
  onUpdateTableStatus,
  onOpenSettleBillModal,
  onOpenQuickSeatModal,
  onOpenThermalPrint,
  onOpenAiMenuImport,
  onNavigateToHostBoard,
  onNavigateToKitchen,
}) => {
  // Selected table to order for
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Filters for floor view
  const [statusFilter, setStatusFilter] = useState<'all' | 'Free' | 'Seated' | 'Bill Requested'>('all');
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [searchTableQuery, setSearchTableQuery] = useState('');

  // Ordering Pad state (when table is selected)
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [menuSearch, setMenuSearch] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | DietaryType>('all');
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);
  const [customNoteText, setCustomNoteText] = useState('');
  const [kotSentToast, setKotSentToast] = useState<string | null>(null);

  // Ready for pickup alert list (kitchen tickets marked ready)
  const readyTickets = useMemo(() => {
    return kitchenTickets.filter((t) => t.status === 'ready');
  }, [kitchenTickets]);

  // Active selected table & order
  const activeTable = tables.find((t) => t.id === selectedTableId) || null;
  const activeReservation = reservations.find(
    (r) => r.tableId === selectedTableId && r.status === 'Seated'
  );
  const activeOrder = orders.find(
    (o) => o.tableId === selectedTableId && o.status !== 'settled'
  );

  // Filter tables
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      if (selectedZone !== 'All' && table.zone !== selectedZone) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'Free' && table.status !== 'Free') return false;
        if (statusFilter === 'Seated' && table.status !== 'Seated') return false;
        if (statusFilter === 'Bill Requested' && table.status !== 'Bill Requested') return false;
      }
      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase();
        const matchingRes = reservations.find(
          (r) => r.tableId === table.id && r.status === 'Seated'
        );
        const guestMatch = matchingRes?.guestName.toLowerCase().includes(q);
        const tableMatch = table.name.toLowerCase().includes(q) || table.zone.toLowerCase().includes(q);
        return tableMatch || guestMatch;
      }
      return true;
    });
  }, [tables, selectedZone, statusFilter, searchTableQuery, reservations]);

  // Filter menu items for pad
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (
        selectedCategory !== 'All' &&
        item.category !== selectedCategory &&
        !(selectedCategory === 'Starters' && item.category === 'Appetizers')
      )
        return false;
      if (dietaryFilter !== 'all' && item.dietary !== dietaryFilter) return false;
      if (menuSearch.trim()) {
        const q = menuSearch.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [menuItems, selectedCategory, dietaryFilter, menuSearch]);

  // Helper to calculate order totals
  const recalculateOrderTotals = (items: OrderItem[], baseOrder: TableOrder): TableOrder => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountAmount = 0;
    if (baseOrder.discountType === 'percent' && baseOrder.discountValue > 0) {
      discountAmount = Math.round(((subtotal * baseOrder.discountValue) / 100) * 100) / 100;
    } else if (baseOrder.discountType === 'fixed' && baseOrder.discountValue > 0) {
      discountAmount = Math.min(subtotal, baseOrder.discountValue);
    }
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const halfRate = (baseOrder.taxRate || 0.05) / 2;
    const cgstAmount = Math.round(taxableAmount * halfRate * 100) / 100;
    const sgstAmount = Math.round(taxableAmount * halfRate * 100) / 100;
    const taxAmount = cgstAmount + sgstAmount;
    const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

    return {
      ...baseOrder,
      items,
      subtotal,
      discountAmount,
      cgstAmount,
      sgstAmount,
      taxAmount,
      grandTotal,
      updatedAt: new Date().toISOString(),
    };
  };

  // Add item from menu pad
  const handleAddItem = (menuItem: MenuItem) => {
    if (!activeTable) return;
    const stockEval = evaluateDishStock(menuItem, ingredients);
    if (!stockEval.isEffectivelyAvailable) return;

    let targetOrder = activeOrder;
    if (!targetOrder) {
      // Create new active order for this table
      const newOrder: TableOrder = {
        id: `order-${activeTable.id}-${Date.now()}`,
        restaurantId,
        tableId: activeTable.id,
        tableName: activeTable.name,
        reservationId: activeReservation?.id,
        guestName: activeReservation?.guestName || `Table ${activeTable.name} Guest`,
        guestPhone: activeReservation?.guestPhone,
        partySize: activeReservation?.partySize || activeTable.capacity,
        waiterName: activeWaiterName,
        isBillRequested: false,
        kotCount: 0,
        items: [],
        taxRate: 0.05,
        discountType: 'none',
        discountValue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        subtotal: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        taxAmount: 0,
        discountAmount: 0,
        grandTotal: 0,
      };
      targetOrder = newOrder;
    }

    // Check if item already exists and is not yet sent to kitchen
    const existingIndex = targetOrder.items.findIndex(
      (it) => it.menuItemId === menuItem.id && !it.sentToKitchen
    );

    let updatedItems: OrderItem[];
    if (existingIndex >= 0) {
      updatedItems = targetOrder.items.map((it, idx) =>
        idx === existingIndex ? { ...it, quantity: it.quantity + 1 } : it
      );
    } else {
      const newItem: OrderItem = {
        id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        sentToKitchen: false,
      };
      updatedItems = [...targetOrder.items, newItem];
    }

    const updated = recalculateOrderTotals(updatedItems, targetOrder);
    onUpdateTableOrder(updated);

    // If table was Free, auto-seat it
    if (activeTable.status === 'Free') {
      onUpdateTableStatus(activeTable.id, 'Seated');
    }
  };

  // Quantity increase
  const handleIncreaseQty = (itemId: string) => {
    if (!activeOrder) return;
    const targetItem = activeOrder.items.find((it) => it.id === itemId);
    if (targetItem) {
      const menuDish = menuItems.find((m) => m.id === targetItem.menuItemId);
      if (menuDish && !evaluateDishStock(menuDish, ingredients).isEffectivelyAvailable) {
        return;
      }
    }
    const updatedItems = activeOrder.items.map((it) =>
      it.id === itemId ? { ...it, quantity: it.quantity + 1 } : it
    );
    const updated = recalculateOrderTotals(updatedItems, activeOrder);
    onUpdateTableOrder(updated);
  };

  // Quantity decrease
  const handleDecreaseQty = (itemId: string) => {
    if (!activeOrder) return;
    const item = activeOrder.items.find((it) => it.id === itemId);
    if (!item) return;

    let updatedItems: OrderItem[];
    if (item.quantity > 1) {
      updatedItems = activeOrder.items.map((it) =>
        it.id === itemId ? { ...it, quantity: it.quantity - 1 } : it
      );
    } else {
      updatedItems = activeOrder.items.filter((it) => it.id !== itemId);
    }
    const updated = recalculateOrderTotals(updatedItems, activeOrder);
    onUpdateTableOrder(updated);
  };

  // Remove unsent item
  const handleRemoveItem = (itemId: string) => {
    if (!activeOrder) return;
    const updatedItems = activeOrder.items.filter((it) => it.id !== itemId);
    const updated = recalculateOrderTotals(updatedItems, activeOrder);
    onUpdateTableOrder(updated);
  };

  // Add quick preset note
  const handleApplyNote = (itemId: string, note: string) => {
    if (!activeOrder) return;
    const updatedItems = activeOrder.items.map((it) => {
      if (it.id !== itemId) return it;
      const current = it.notes ? `${it.notes}, ${note}` : note;
      return { ...it, notes: current };
    });
    const updated = recalculateOrderTotals(updatedItems, activeOrder);
    onUpdateTableOrder(updated);
    setActiveNoteItemId(null);
  };

  // Custom note submit
  const handleSaveCustomNote = (itemId: string) => {
    if (!activeOrder || !customNoteText.trim()) {
      setActiveNoteItemId(null);
      return;
    }
    const updatedItems = activeOrder.items.map((it) => {
      if (it.id !== itemId) return it;
      const current = it.notes ? `${it.notes}, ${customNoteText.trim()}` : customNoteText.trim();
      return { ...it, notes: current };
    });
    const updated = recalculateOrderTotals(updatedItems, activeOrder);
    onUpdateTableOrder(updated);
    setCustomNoteText('');
    setActiveNoteItemId(null);
  };

  // Send KOT to Kitchen
  const handleSendKOT = () => {
    if (!activeOrder || !activeTable) return;
    const unsentItems = activeOrder.items.filter((it) => !it.sentToKitchen);
    if (unsentItems.length === 0) return;

    const currentTimeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Mark items as sent
    const updatedItems = activeOrder.items.map((it) =>
      !it.sentToKitchen ? { ...it, sentToKitchen: true, sentAt: currentTimeStr } : it
    );

    const newKotCount = (activeOrder.kotCount || 0) + 1;
    const kotNumber = `KOT #${100 + newKotCount}`;

    // Create Kitchen Ticket for KDS
    const newKitchenTicket: KitchenTicket = {
      id: `kot-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      kotNumber,
      restaurantId,
      orderId: activeOrder.id,
      tableId: activeTable.id,
      tableName: activeTable.name,
      waiterName: activeWaiterName,
      guestName: activeOrder.guestName || `Table ${activeTable.name}`,
      partySize: activeOrder.partySize,
      status: 'pending',
      createdAt: new Date().toISOString(),
      items: unsentItems.map((it) => {
        const menuItem = menuItems.find((m) => m.id === it.menuItemId);
        return {
          id: `ki-${Date.now()}-${it.id}`,
          orderItemId: it.id,
          name: it.name,
          quantity: it.quantity,
          notes: it.notes,
          dietary: menuItem?.dietary,
          completed: false,
        };
      }),
    };

    const updatedOrder: TableOrder = {
      ...recalculateOrderTotals(updatedItems, activeOrder),
      status: 'preparing',
      kotCount: newKotCount,
      kotList: [...(activeOrder.kotList || []), newKitchenTicket],
      waiterName: activeWaiterName,
    };

    onSendKOT(newKitchenTicket, updatedOrder);
    setKotSentToast(`${kotNumber} sent to Kitchen (${unsentItems.length} items)`);
    setTimeout(() => setKotSentToast(null), 3000);
  };

  // Toggle "Bill Requested"
  const handleToggleBillRequested = () => {
    if (!activeTable) return;
    const isNowRequested = activeTable.status !== 'Bill Requested';
    const nextStatus = isNowRequested ? 'Bill Requested' : 'Seated';
    onUpdateTableStatus(activeTable.id, nextStatus);

    if (activeOrder) {
      onUpdateTableOrder({
        ...activeOrder,
        isBillRequested: isNowRequested,
      });
    }
  };

  // Render Dietary badge helper
  const renderDietaryIcon = (type: DietaryType) => {
    if (type === 'Veg') {
      return (
        <span
          title="Vegetarian"
          className="inline-flex items-center justify-center w-4 h-4 rounded-xs border border-emerald-600 bg-white"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
        </span>
      );
    }
    if (type === 'Non-Veg') {
      return (
        <span
          title="Non-Vegetarian"
          className="inline-flex items-center justify-center w-4 h-4 rounded-xs border border-rose-600 bg-white"
        >
          <span className="w-0 h-0 border-x-3 border-x-transparent border-b-6 border-b-rose-600" />
        </span>
      );
    }
    return (
      <span
        title="Vegan"
        className="inline-flex items-center justify-center w-4 h-4 rounded-xs border border-emerald-500 bg-emerald-50 text-[9px] font-bold text-emerald-800"
      >
        V
      </span>
    );
  };

  const unsentCount = activeOrder?.items.filter((it) => !it.sentToKitchen).length || 0;

  return (
    <div className="space-y-4">
      {/* ----------------------------------------------------------- */}
      {/* 1. COMPACT WAITER FLOOR BAR (NO BACK-OFFICE CLUTTER)        */}
      {/* ----------------------------------------------------------- */}
      <div className="bg-stone-900 text-white rounded-2xl px-4 py-3.5 sm:px-5 shadow-md border border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold font-serif-display tracking-tight text-white">
                Waiter Order Pad
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono-tabular">
                TOUCH FLOOR
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              {restaurantName} · Tap any table to punch orders or send KOTs
            </p>
          </div>
        </div>

        {/* Waiter Profile Selector & Ready Pickup Alerts */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Ready for Pickup Alert Pills */}
          {readyTickets.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {readyTickets.map((rt) => (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setSelectedTableId(rt.tableId)}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Table {rt.tableName} Order Ready</span>
                </button>
              ))}
            </div>
          )}

          {/* Waiter / Server Selector */}
          <div className="flex items-center gap-2 bg-stone-800/90 px-3 py-2 rounded-xl border border-stone-700 text-xs min-h-[40px]">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-stone-400 font-medium hidden sm:inline">Steward:</span>
            <select
              aria-label="Select active steward"
              value={activeWaiterName}
              onChange={(e) => onChangeWaiterName(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
            >
              {staffAccounts.map((s) => (
                <option key={s.id} value={s.name} className="bg-stone-900 text-white">
                  {s.name} ({s.role})
                </option>
              ))}
              <option value="Guest Captain" className="bg-stone-900 text-white">
                Guest Captain
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Toast Banner for KOT sent */}
      {kotSentToast && (
        <div className="p-3 bg-emerald-900/90 text-emerald-100 border border-emerald-700 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{kotSentToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setKotSentToast(null)}
            className="text-emerald-300 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 2. MAIN SPLIT / FULLSCREEN PAD OR FLOOR VIEW                */}
      {/* ----------------------------------------------------------- */}
      {selectedTableId && activeTable ? (
        /* STREAMLINED FULLSCREEN-FRIENDLY WAITER ORDERING PAD */
        <div className="bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[720px]">
          {/* LEFT 65%: Menu Catalog & Category Chips */}
          <div className="lg:w-3/5 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-stone-200 flex flex-col space-y-4">
            {/* Header: Back Button + Table Info */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTableId(null)}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors flex items-center gap-1 text-xs font-semibold min-h-[40px]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Floor View</span>
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-mono-tabular text-stone-900">
                      Table {activeTable.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeTable.status === 'Bill Requested'
                          ? 'bg-blue-100 text-blue-800'
                          : activeTable.status === 'Seated'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {activeTable.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-mono-tabular">
                    {activeTable.zone} · {activeOrder?.partySize || activeTable.capacity} Guests · Server: {activeWaiterName}
                  </p>
                </div>
              </div>

              {/* Status Action: Toggle Bill Requested */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleBillRequested}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                    activeTable.status === 'Bill Requested'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-stone-100 hover:bg-blue-50 text-stone-700 hover:text-blue-700 border-stone-300'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>
                    {activeTable.status === 'Bill Requested'
                      ? 'Bill Requested (Active)'
                      : 'Request Bill (Blue)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Large Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {['All', ...MENU_CATEGORIES].map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                      active
                        ? 'bg-stone-900 text-white shadow-xs scale-[1.02]'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Search & Dietary Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search dishes, drinks..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              {/* Dietary selector chips */}
              <div className="inline-flex items-center gap-1 p-0.5 bg-stone-100 rounded-xl">
                {(['all', 'Veg', 'Non-Veg', 'Vegan'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDietaryFilter(d)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      dietaryFilter === d
                        ? 'bg-white text-stone-900 font-bold shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {d === 'all' ? 'All' : d}
                  </button>
                ))}
              </div>
            </div>

            {/* Item Cards Grid */}
            <div className="flex-1 overflow-y-auto max-h-[520px] pr-1">
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
                      className={`p-3 border rounded-xl text-left transition-all flex flex-col justify-between gap-2 group ${
                        isAvailable
                          ? 'bg-[#FAF9F6] hover:bg-stone-100/90 active:scale-[0.98] border-stone-200 hover:border-stone-400'
                          : 'bg-rose-50/40 border-rose-200 opacity-75 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1 w-full">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-bold truncate ${
                              isAvailable
                                ? 'text-stone-900 group-hover:text-stone-950'
                                : 'text-stone-500 line-through'
                            }`}
                          >
                            {item.name}
                          </span>
                          <div className="shrink-0 flex items-center gap-1.5">
                            {!isAvailable && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider shadow-2xs">
                                Sold Out
                              </span>
                            )}
                            {renderDietaryIcon(item.dietary)}
                          </div>
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-1 leading-snug">
                          {!isAvailable && stockEval.missingIngredients.length > 0
                            ? `86'd · Out of ${stockEval.missingIngredients.join(', ')}`
                            : item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 w-full">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold font-mono-tabular text-stone-900">
                            {formatCurrency(item.price)}
                          </span>
                          {isAvailable && stockEval.hasRecipe && stockEval.maxServings !== null && (
                            <span className="text-[10px] font-mono-tabular text-stone-500">
                              · {stockEval.maxServings} left
                            </span>
                          )}
                        </div>
                        {isAvailable ? (
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            + Add
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                            86 / Out of Stock
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 40%: Current Ticket & Live KOT Action Tray */}
          <div className="lg:w-2/5 p-4 sm:p-6 bg-[#FAF9F6] flex flex-col justify-between space-y-4">
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Live Table Ticket
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono-tabular">
                    {activeOrder?.items.length || 0} line items · KOT #{100 + (activeOrder?.kotCount || 0) + 1} Pending
                  </p>
                </div>

                {unsentCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full border border-amber-300 animate-pulse">
                    {unsentCount} New to Send
                  </span>
                )}
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[380px] pr-1">
                {!activeOrder || activeOrder.items.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 space-y-2 border-2 border-dashed border-stone-200 rounded-xl my-4">
                    <UtensilsCrossed className="w-8 h-8 mx-auto text-stone-300" />
                    <p className="text-xs">No items ordered yet.</p>
                    <p className="text-[11px] text-stone-400">
                      Tap any menu dish on the left to start this table ticket.
                    </p>
                  </div>
                ) : (
                  activeOrder.items.map((it) => {
                    const isNew = !it.sentToKitchen;
                    const isOpenNote = activeNoteItemId === it.id;

                    return (
                      <div
                        key={it.id}
                        className={`p-3 rounded-xl border text-xs space-y-2 transition-colors ${
                          isNew
                            ? 'bg-amber-50/60 border-amber-300 shadow-2xs'
                            : 'bg-white border-stone-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                const menuItem = menuItems.find((m) => m.id === it.menuItemId);
                                return menuItem ? renderDietaryIcon(menuItem.dietary) : null;
                              })()}
                              <span className="font-bold text-stone-900 truncate">
                                {it.name}
                              </span>
                              {isNew ? (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-amber-200 text-amber-900 rounded">
                                  NEW
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-100 text-emerald-800 rounded flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" />
                                  KOT {it.sentAt}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-500 font-mono-tabular">
                              {formatCurrency(it.price)} each
                            </span>
                          </div>

                          <span className="font-bold font-mono-tabular text-stone-900">
                            {formatCurrency(it.price * it.quantity)}
                          </span>
                        </div>

                        {/* Existing Notes Display */}
                        {it.notes && (
                          <div className="p-1.5 bg-white border border-stone-200 rounded-lg text-[11px] text-stone-700 italic flex items-center justify-between">
                            <span>Note: {it.notes}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const cleared = activeOrder.items.map((x) =>
                                  x.id === it.id ? { ...x, notes: undefined } : x
                                );
                                onUpdateTableOrder(recalculateOrderTotals(cleared, activeOrder));
                              }}
                              className="text-stone-400 hover:text-stone-600 ml-1"
                              title="Clear note"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Modifiers & Quick Notes Popover */}
                        {isOpenNote && (
                          <div className="p-2.5 bg-stone-900 text-white rounded-xl space-y-2 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                Kitchen Instructions:
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveNoteItemId(null)}
                                className="text-stone-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Preset Chips */}
                            <div className="flex flex-wrap gap-1">
                              {COMMON_NOTES.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => handleApplyNote(it.id, preset)}
                                  className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-[10px] font-medium transition-colors"
                                >
                                  + {preset}
                                </button>
                              ))}
                            </div>

                            {/* Custom Note input */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                value={customNoteText}
                                onChange={(e) => setCustomNoteText(e.target.value)}
                                placeholder="Type custom note..."
                                className="flex-1 px-2 py-1 text-xs bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveCustomNote(it.id)}
                                className="px-2.5 py-1 bg-amber-500 text-stone-950 font-bold rounded-lg text-xs"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Bottom Row: - / + counters & Note trigger */}
                        <div className="flex items-center justify-between pt-1 border-t border-stone-200/50">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveNoteItemId(isOpenNote ? null : it.id);
                              setCustomNoteText('');
                            }}
                            className="text-[11px] text-stone-600 hover:text-stone-900 flex items-center gap-1 font-medium"
                          >
                            <MessageSquare className="w-3 h-3 text-stone-400" />
                            <span>{it.notes ? 'Edit note' : '+ Add modifier note'}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDecreaseQty(it.id)}
                              className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 flex items-center justify-center font-bold"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center font-bold font-mono-tabular text-stone-900 text-xs">
                              {it.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleIncreaseQty(it.id)}
                              className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 flex items-center justify-center font-bold"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            {isNew && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.id)}
                                className="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors ml-1"
                                title="Delete item"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Calculations & Bottom Action Bar */}
            <div className="pt-3 border-t border-stone-200 space-y-3">
              {activeOrder && activeOrder.items.length > 0 && (
                <div className="space-y-1 text-xs font-mono-tabular text-stone-600 bg-white p-3 rounded-xl border border-stone-200">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-stone-900">
                      {formatCurrency(activeOrder.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500">
                    <span>GST (2.5% CGST + 2.5% SGST)</span>
                    <span>{formatCurrency(activeOrder.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-stone-100">
                    <span>Current Bill Total</span>
                    <span className="text-base text-stone-950 font-bold">
                      {formatCurrency(activeOrder.grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Thermal Print Actions */}
              {onOpenThermalPrint && activeOrder && activeOrder.items.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenThermalPrint(activeOrder.id, 'kot')}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print KOT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenThermalPrint(activeOrder.id, 'bill')}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Bill</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSendKOT}
                  disabled={unsentCount === 0}
                  className="px-4 py-3 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 min-h-[46px] cursor-pointer"
                >
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>Send KOT ({unsentCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSettleBillModal(activeTable.id)}
                  disabled={!activeOrder || activeOrder.items.length === 0}
                  className="px-4 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[46px] cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Settle Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ----------------------------------------------------------- */
        /* 3. TOUCH-FIRST FLOOR LAYOUT (TABLE STATUS CARDS)            */
        /* ----------------------------------------------------------- */
        <div className="space-y-4">
          {/* Status Color Legend & Filter Strip */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Status Legend Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-stone-700 mr-1">Floor Status:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                All Tables ({tables.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Free')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  statusFilter === 'Free'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Available ({tables.filter((t) => t.status === 'Free').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Seated')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  statusFilter === 'Seated'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Seated / Active ({tables.filter((t) => t.status === 'Seated').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Bill Requested')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  statusFilter === 'Bill Requested'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Bill Requested ({tables.filter((t) => t.status === 'Bill Requested').length})</span>
              </button>
            </div>

            {/* Zone Filter & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTableQuery}
                  onChange={(e) => setSearchTableQuery(e.target.value)}
                  placeholder="Filter table or guest..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-900 w-44"
                />
              </div>

              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#FAF9F6] border border-stone-200 rounded-xl text-stone-800 font-medium focus:outline-none"
              >
                <option value="All">All Zones</option>
                <option value="Main Hall">Main Hall</option>
                <option value="Courtyard">Courtyard</option>
                <option value="Bar">Bar</option>
                <option value="Private Room">Private Room</option>
              </select>
            </div>
          </div>

          {/* Table Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTables.map((table) => {
              const matchingOrder = orders.find(
                (o) => o.tableId === table.id && o.status !== 'settled'
              );
              const matchingRes = reservations.find(
                (r) =>
                  r.tableId === table.id &&
                  (r.status === 'Seated' || r.status === 'Confirmed')
              );

              // Status styles: Green = Available, Orange = Seated, Blue = Bill Requested
              const isFree = table.status === 'Free';
              const isSeated = table.status === 'Seated';
              const isBillReq = table.status === 'Bill Requested';

              const hasUnsent = matchingOrder?.items.some((it) => !it.sentToKitchen);
              const readyForPickup = readyTickets.some((t) => t.tableId === table.id);

              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTableId(table.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-sm relative overflow-hidden group flex flex-col justify-between min-h-[170px] ${
                    isBillReq
                      ? 'bg-blue-50/80 border-blue-500 hover:border-blue-600 hover:shadow-md'
                      : isSeated
                      ? 'bg-amber-50/70 border-amber-500 hover:border-amber-600 hover:shadow-md'
                      : 'bg-emerald-50/60 border-emerald-500 hover:border-emerald-600 hover:shadow-md'
                  }`}
                >
                  {/* Status Tag & Top Badges */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold font-mono-tabular text-stone-900">
                          {table.name}
                        </span>
                        <span className="text-xs text-stone-500 font-mono-tabular">
                          ({table.capacity}p)
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isBillReq
                            ? 'bg-blue-600 text-white'
                            : isSeated
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isBillReq ? 'Bill Ready' : isSeated ? 'Active' : 'Available'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-600 mt-1">
                      <span>{table.zone}</span>
                      <span>·</span>
                      <span className="font-semibold text-stone-800">
                        {matchingOrder?.partySize || matchingRes?.partySize || table.capacity} Guests
                      </span>
                      {matchingRes?.guestName && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-stone-900 truncate max-w-[120px]">
                            {matchingRes.guestName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Middle: Order, Elapsed Time & KDS indicators */}
                  <div className="py-2 space-y-1.5">
                    {matchingOrder ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono-tabular">
                          <span className="text-stone-500 font-medium">Current Bill:</span>
                          <span className="font-bold text-stone-950 text-base">
                            {formatCurrency(matchingOrder.grandTotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono-tabular">
                          <span className="flex items-center gap-1 text-amber-900 font-semibold bg-amber-100/80 px-1.5 py-0.5 rounded-md">
                            <Clock className="w-3 h-3 text-amber-700" />
                            {Math.max(
                              1,
                              Math.floor(
                                (Date.now() - new Date(matchingOrder.createdAt).getTime()) / 60000
                              )
                            )}m elapsed
                          </span>
                          <span>{matchingOrder.items.length} items · KOT #{100 + (matchingOrder.kotCount || 1)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500 italic">
                        Tap table to open order pad &amp; seat guest
                      </p>
                    )}
                  </div>

                  {/* Bottom Alerts & Quick Actions */}
                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {readyForPickup && (
                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-bold flex items-center gap-1 animate-pulse">
                          <Bell className="w-2.5 h-2.5" />
                          Table {table.name} Order Ready
                        </span>
                      )}
                      {hasUnsent && (
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md text-[10px] font-bold">
                          Unsent KOT
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-bold text-stone-800 group-hover:translate-x-0.5 transition-transform">
                      {isFree ? 'Seat / Order →' : 'Open Order Pad →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
