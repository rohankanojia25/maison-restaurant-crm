import React, { useState } from 'react';
import {
  Reservation,
  RestaurantTable,
  ServiceBoardView,
  ShiftFilter,
  TableZone,
  ReservationStatus,
  TableOrder,
  KitchenTicket,
} from '../types';
import {
  getTodayDateString,
  getYesterdayDateString,
  getLast7DaysDateStrings,
  formatShiftHeading,
} from '../utils/date';
import { formatCurrency } from '../utils/currency';
import {
  Check,
  Clock,
  MoreHorizontal,
  Plus,
  Search,
  UserCheck,
  Utensils,
  XCircle,
  Edit3,
  AlertTriangle,
  RotateCcw,
  Users,
  Calendar,
  UtensilsCrossed,
  CreditCard,
  ChefHat,
  Bell,
} from 'lucide-react';

interface ServiceBoardProps {
  reservations: Reservation[];
  tables: RestaurantTable[];
  orders?: TableOrder[];
  kitchenTickets?: KitchenTicket[];
  onNavigateToKitchen?: () => void;
  onNavigateToWaiterPad?: () => void;
  view: ServiceBoardView;
  onViewChange: (v: ServiceBoardView) => void;
  shiftFilter: ShiftFilter;
  onShiftFilterChange: (s: ShiftFilter) => void;
  onSeatGuest: (reservationId: string) => void;
  onCompleteDining: (reservationId: string) => void;
  onMarkNoShow: (reservationId: string) => void;
  onCancelReservation: (reservationId: string) => void;
  onRestoreReservation: (reservationId: string) => void;
  onEditReservation: (reservation: Reservation) => void;
  onSelectGuestById: (guestId: string, fallbackName?: string) => void;
  onQuickSeatTable: (tableId: string) => void;
  onBookSpecificTable: (tableId: string) => void;
  onCompleteDiningByTable: (tableId: string) => void;
  onOpenOrderDrawer?: (tableId: string) => void;
  onOpenSettleBillModal?: (tableId: string) => void;
  onOpenNewBooking: () => void;
}

const ZONES: TableZone[] = ['Main Hall', 'Courtyard', 'Bar', 'Private Room'];

export const ServiceBoard: React.FC<ServiceBoardProps> = ({
  reservations,
  tables,
  orders = [],
  kitchenTickets = [],
  onNavigateToKitchen,
  onNavigateToWaiterPad,
  view,
  onViewChange,
  shiftFilter,
  onShiftFilterChange,
  onSeatGuest,
  onCompleteDining,
  onMarkNoShow,
  onCancelReservation,
  onRestoreReservation,
  onEditReservation,
  onSelectGuestById,
  onQuickSeatTable,
  onBookSpecificTable,
  onCompleteDiningByTable,
  onOpenOrderDrawer,
  onOpenSettleBillModal,
  onOpenNewBooking,
}) => {
  const todayDateStr = getTodayDateString();
  const yesterdayDateStr = getYesterdayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [isLast7Days, setIsLast7Days] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'All' | ReservationStatus>('Active');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const readyTickets = kitchenTickets.filter((t) => t.status === 'ready');

  const isTodayActive = view === 'today' && !isLast7Days && selectedDate === todayDateStr;
  const isYesterdayActive = view === 'today' && !isLast7Days && selectedDate === yesterdayDateStr;
  const isLast7DaysActive = view === 'today' && isLast7Days;
  const isCustomDateActive =
    view === 'today' &&
    !isLast7Days &&
    selectedDate !== todayDateStr &&
    selectedDate !== yesterdayDateStr;

  const targetDateSet = new Set(
    isLast7Days ? getLast7DaysDateStrings(todayDateStr) : [selectedDate]
  );

  // Filter reservations based on selectedDate / Last 7 Days vs Upcoming
  const dateFilteredReservations = reservations.filter((r) => {
    if (view === 'upcoming') {
      return r.date > todayDateStr;
    }
    return targetDateSet.has(r.date);
  });

  // Shift filter
  const shiftFiltered = dateFilteredReservations.filter((r) => {
    if (shiftFilter === 'all') return true;
    return r.shift === shiftFilter;
  });

  // Status & Search filter
  const visibleReservations = shiftFiltered.filter((r) => {
    if (statusFilter === 'Active') {
      if (r.status === 'Cancelled') return false;
    } else if (statusFilter !== 'All' && r.status !== statusFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.guestName.toLowerCase().includes(q) ||
      r.guestPhone.toLowerCase().includes(q) ||
      r.tableName.toLowerCase().includes(q) ||
      r.tableZone.toLowerCase().includes(q) ||
      r.specialRequests.toLowerCase().includes(q)
    );
  });

  // KPI metrics for selected shift date / period
  const todayReservations = reservations.filter((r) => targetDateSet.has(r.date));
  const confirmedCount = todayReservations.filter((r) => r.status === 'Confirmed').length;
  const seatedCount = todayReservations.filter((r) => r.status === 'Seated').length;
  const completedCount = todayReservations.filter((r) => r.status === 'Completed').length;
  const totalCoversToday = todayReservations
    .filter((r) => r.status !== 'Cancelled' && r.status !== 'No-Show')
    .reduce((sum, r) => sum + r.partySize, 0);

  const freeTablesCount = tables.filter((t) => t.status === 'Free').length;
  const occupiedTablesCount = tables.filter((t) => t.status === 'Seated').length;

  const getStatusLabelColor = (status: ReservationStatus) => {
    switch (status) {
      case 'Seated':
        return 'text-emerald-700 font-semibold';
      case 'Confirmed':
        return 'text-amber-700 font-semibold';
      case 'Completed':
        return 'text-stone-600 font-medium';
      case 'No-Show':
        return 'text-red-700 font-semibold';
      case 'Cancelled':
        return 'text-stone-400 line-through';
    }
  };

  const [mobileServiceTab, setMobileServiceTab] = useState<'bookings' | 'tables'>('bookings');

  return (
    <div className="space-y-4">
      {/* Visual notification banner when Kitchen marks an order Ready for Pickup */}
      {readyTickets.length > 0 && (
        <div className="bg-emerald-950 border border-emerald-500/50 text-emerald-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {readyTickets.length} KOT Ticket(s) Ready for Pickup!
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500 text-stone-950 font-bold uppercase tracking-wider animate-pulse">
                  Ready Now
                </span>
              </div>
              <p className="text-xs text-emerald-300 font-mono-tabular mt-0.5">
                Kitchen ready for tables:{' '}
                <strong className="text-white">
                  {readyTickets.map((t) => `Table ${t.tableName} (${t.kotNumber})`).join(', ')}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToWaiterPad && (
              <button
                type="button"
                onClick={onNavigateToWaiterPad}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 min-h-[38px]"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Open Waiter Pad</span>
              </button>
            )}
            {onNavigateToKitchen && (
              <button
                type="button"
                onClick={onNavigateToKitchen}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-emerald-300 font-semibold text-xs rounded-xl transition-colors border border-emerald-600/40 flex items-center gap-1.5 min-h-[38px]"
              >
                <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                <span>View Kitchen Queue</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sleek 1-Line Service Summary Strip */}
      <div className="bg-white border border-stone-200 rounded-xl px-5 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-stone-900 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {view === 'upcoming'
              ? 'Upcoming Bookings:'
              : `${formatShiftHeading(selectedDate, isLast7Days)}:`}
          </span>
          <span className="font-bold text-stone-900 font-mono-tabular">
            {totalCoversToday} Covers
          </span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span className="font-semibold text-emerald-800 font-mono-tabular">
            {seatedCount} Seated
          </span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span className="font-semibold text-stone-700 font-mono-tabular">
            {freeTablesCount} Tables Free
          </span>
          {confirmedCount > 0 && (
            <>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span className="text-amber-800 font-medium font-mono-tabular">
                {confirmedCount} Awaiting
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-stone-500 text-[11px] font-mono-tabular">
          <span>{occupiedTablesCount}/{tables.length} Tables Active</span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span>{completedCount} Completed</span>
        </div>
      </div>

      {/* Combined Single Segmented Pill Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-2.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Date Toggle & Shift Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Toggle (Today / Yesterday / Last 7 Days / Upcoming + Date Picker) */}
          <div className="inline-flex items-center gap-1 p-1 bg-stone-100 rounded-lg flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedDate(getTodayDateString());
                setIsLast7Days(false);
                onViewChange('today');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md min-h-[38px] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isTodayActive
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(getYesterdayDateString());
                setIsLast7Days(false);
                onViewChange('today');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md min-h-[38px] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isYesterdayActive
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(getTodayDateString());
                setIsLast7Days(true);
                onViewChange('today');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md min-h-[38px] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isLast7DaysActive
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLast7Days(false);
                onViewChange('upcoming');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md min-h-[38px] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'upcoming'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Upcoming
            </button>
            <input
              type="date"
              aria-label="Filter service board by date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  setIsLast7Days(false);
                  onViewChange('today');
                }
              }}
              className={`px-2 py-1 text-xs rounded-md min-h-[34px] transition-all focus:outline-none ${
                isCustomDateActive
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'bg-white/80 text-stone-700 border border-stone-200/80 hover:bg-white'
              }`}
            />
          </div>

          {/* Shift Filter Pills */}
          <div className="inline-flex items-center gap-1 p-1 bg-stone-100 rounded-lg">
            <button
              type="button"
              onClick={() => onShiftFilterChange('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md min-h-[38px] transition-colors whitespace-nowrap shrink-0 ${
                shiftFilter === 'all'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Shifts
            </button>
            <button
              type="button"
              onClick={() => onShiftFilterChange('Lunch')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md min-h-[38px] transition-colors whitespace-nowrap shrink-0 ${
                shiftFilter === 'Lunch'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Lunch
            </button>
            <button
              type="button"
              onClick={() => onShiftFilterChange('Dinner')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md min-h-[38px] transition-colors whitespace-nowrap shrink-0 ${
                shiftFilter === 'Dinner'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Dinner
            </button>
          </div>

          {/* Table Floor Toggle */}
          <button
            type="button"
            onClick={() => onViewChange(view === 'floor' ? 'today' : 'floor')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border min-h-[38px] transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              view === 'floor'
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs font-semibold'
                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Floor Plan</span>
          </button>
        </div>

        {/* Right: Search & Status Filter */}
        {view !== 'floor' && (
          <div className="flex items-center gap-2 flex-1 md:max-w-xs">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest, table, note..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 min-h-[38px]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label="Filter by reservation status"
              className="px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900 min-h-[38px] shrink-0"
            >
              <option value="Active">Active</option>
              <option value="All">All</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Seated">Seated</option>
              <option value="Completed">Completed</option>
              <option value="No-Show">No-Show</option>
            </select>
          </div>
        )}
      </div>

      {/* Mobile-only Segmented Tabs: [Bookings] vs [Tables] (hidden on desktop lg) */}
      {view !== 'floor' && (
        <div className="lg:hidden flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            type="button"
            onClick={() => setMobileServiceTab('bookings')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg min-h-[44px] flex items-center justify-center gap-2 transition-all ${
              mobileServiceTab === 'bookings'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-stone-700" />
            <span>Bookings ({visibleReservations.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileServiceTab('tables')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg min-h-[44px] flex items-center justify-center gap-2 transition-all ${
              mobileServiceTab === 'tables'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Utensils className="w-4 h-4 text-emerald-700" />
            <span>Tables ({freeTablesCount} Free)</span>
          </button>
        </div>
      )}

      {/* Main Content Split: Left (Reservations or Floor View) + Right (Real-time Table Status Side Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns (Bookings or Floor Plan) */}
        <div
          className={`lg:col-span-8 space-y-4 ${
            view !== 'floor' && mobileServiceTab === 'tables' ? 'hidden lg:block' : 'block'
          }`}
        >
          {view === 'floor' ? (
            /* TABLE FLOOR VIEW */
            <div className="space-y-6">
              {ZONES.map((zone) => {
                const zoneTables = tables.filter((t) => t.zone === zone);
                if (zoneTables.length === 0) return null;
                const freeInZone = zoneTables.filter((t) => t.status === 'Free').length;

                return (
                  <div
                    key={zone}
                    className="bg-white border border-stone-200 rounded-xl p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-stone-900">
                          {zone}
                        </h3>
                        <p className="text-xs text-stone-500">
                          Architectural Floor Layout · Click any table for instant seating or booking
                        </p>
                      </div>
                      <div className="text-xs text-stone-600 font-mono-tabular">
                        <span>{freeInZone} Free</span>
                        <span className="mx-1.5">·</span>
                        <span>{zoneTables.length - freeInZone} Seated</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {zoneTables.map((table) => {
                        const isSeated =
                          table.status === 'Seated' ||
                          table.status === 'Bill Requested';
                        const isBilling = table.status === 'Bill Requested';
                        const activeRes = reservations.find(
                          (r) =>
                            r.id === table.currentReservationId ||
                            (r.tableId === table.id &&
                              r.date === todayDateStr &&
                              r.status === 'Seated')
                        );
                        const nextConfirmedRes = reservations.find(
                          (r) =>
                            r.tableId === table.id &&
                            r.date === todayDateStr &&
                            r.status === 'Confirmed' &&
                            (shiftFilter === 'all' || r.shift === shiftFilter)
                        );

                        return (
                          <div
                            key={table.id}
                            className={`p-5 rounded-xl border transition-colors flex flex-col justify-between gap-4 ${
                              isBilling
                                ? 'bg-blue-50/40 border-blue-300'
                                : isSeated
                                ? 'bg-[#F3F8F5] border-emerald-300'
                                : 'bg-[#FAF9F6] border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xl font-bold font-mono-tabular text-stone-900">
                                    {table.name}
                                  </span>
                                  <span className="text-xs text-stone-500 font-mono-tabular">
                                    · {table.capacity} pax
                                  </span>
                                </div>
                                <span
                                  className={`text-xs font-medium ${
                                    isBilling
                                      ? 'text-blue-700 font-semibold'
                                      : isSeated
                                      ? 'text-emerald-800'
                                      : 'text-stone-600'
                                  }`}
                                >
                                  {isBilling
                                    ? 'Billing (Check Open)'
                                    : isSeated
                                    ? 'Seated (Occupied)'
                                    : 'Free Table'}
                                </span>
                              </div>

                              {/* Visual Seat Geometry Representation */}
                              <div className="py-2 flex items-center gap-1.5">
                                {Array.from({ length: table.capacity }).map(
                                  (_, idx) => (
                                    <span
                                      key={idx}
                                      className={`h-2.5 flex-1 rounded-xs ${
                                        isSeated
                                          ? 'bg-emerald-600'
                                          : 'bg-stone-300'
                                      }`}
                                      title={`Seat ${idx + 1}`}
                                    />
                                  )
                                )}
                              </div>

                              {isSeated && activeRes ? (
                                <div className="pt-1 text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onSelectGuestById(
                                          activeRes.guestId,
                                          activeRes.guestName
                                        )
                                      }
                                      className="font-semibold text-stone-900 hover:underline text-left"
                                    >
                                      {activeRes.guestName}
                                    </button>
                                    <span className="font-mono-tabular text-stone-600">
                                      {activeRes.partySize} guests · {activeRes.time}
                                    </span>
                                  </div>
                                  {activeRes.specialRequests && (
                                    <p className="text-stone-600 line-clamp-1">
                                      Note: {activeRes.specialRequests}
                                    </p>
                                  )}
                                </div>
                              ) : nextConfirmedRes ? (
                                <div className="pt-1 text-xs text-stone-600 space-y-1">
                                  <p>
                                    Next:{' '}
                                    <span className="font-medium text-stone-900">
                                      {nextConfirmedRes.guestName}
                                    </span>{' '}
                                    at{' '}
                                    <span className="font-mono-tabular">
                                      {nextConfirmedRes.time}
                                    </span>{' '}
                                    ({nextConfirmedRes.partySize} pax)
                                  </p>
                                </div>
                              ) : (
                                <p className="pt-1 text-xs text-stone-500">
                                  Open for walk-in or reservation assignment
                                </p>
                              )}
                            </div>

                            <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between gap-2">
                              {isSeated ? (
                                <div className="flex items-center gap-2 w-full">
                                  <button
                                    type="button"
                                    onClick={() => onOpenOrderDrawer?.(table.id)}
                                    className="flex-1 py-2 px-3 min-h-[44px] bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
                                  >
                                    <UtensilsCrossed className="w-3.5 h-3.5" />
                                    <span>
                                      Order {(() => {
                                        const ord = orders.find(
                                          (o) => o.tableId === table.id && o.status !== 'settled'
                                        );
                                        return ord ? `(${ord.items.length})` : '';
                                      })()}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenSettleBillModal?.(table.id)}
                                    className="py-2 px-3.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>
                                      Settle {(() => {
                                        const ord = orders.find(
                                          (o) => o.tableId === table.id && o.status !== 'settled'
                                        );
                                        return ord ? `(${formatCurrency(ord.grandTotal)})` : '';
                                      })()}
                                    </span>
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {nextConfirmedRes ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onSeatGuest(nextConfirmedRes.id)
                                      }
                                      className="flex-1 py-2 px-3 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center active:scale-95"
                                    >
                                      Seat {nextConfirmedRes.guestName.split(' ')[0]}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onQuickSeatTable(table.id)}
                                      className="flex-1 py-2 px-3 min-h-[44px] bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center active:scale-95"
                                    >
                                      + Walk-in Here
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onBookSpecificTable(table.id)
                                    }
                                    className="py-2 px-3.5 min-h-[44px] bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center active:scale-95"
                                  >
                                    Book Slot
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* RESERVATION CARDS LIST (TODAY'S SERVICE OR UPCOMING BOOKINGS) */
            <>
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-semibold text-stone-900">
                  {view === 'today'
                    ? formatShiftHeading(selectedDate, isLast7Days)
                    : 'Upcoming Confirmed Bookings'}
                </h2>
                <span className="text-xs text-stone-500 font-mono-tabular">
                  Showing {visibleReservations.length} reservations
                </span>
              </div>

              {visibleReservations.length === 0 ? (
                <div className="bg-white border border-stone-200 rounded-xl p-8 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-500">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      No reservations for this shift
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                      All tables are ready for service. Add an advance booking or seat a walk-in guest instantly.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onOpenNewBooking}
                      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-2 min-h-[44px] shadow-xs active:scale-95"
                    >
                      <Plus className="w-4 h-4 text-amber-400" />
                      <span>Add First Reservation</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleReservations.map((res) => {
                    const isMenuOpen = openMenuId === res.id;

                    return (
                      <div
                        key={res.id}
                        className={`bg-white border rounded-xl p-5 transition-colors ${
                          res.status === 'Seated'
                            ? 'border-emerald-300 bg-[#FBFEFC]'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Left & Center Info */}
                          <div className="space-y-2 flex-1">
                            {/* Top Metadata Row (Unboxed clean typography with separators) */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono-tabular font-semibold text-stone-900 text-sm">
                                {res.time}
                              </span>
                              {view === 'upcoming' && (
                                <>
                                  <span aria-hidden="true" className="text-stone-300">
                                    ·
                                  </span>
                                  <span className="font-mono-tabular text-stone-600">
                                    {res.date}
                                  </span>
                                </>
                              )}
                              <span aria-hidden="true" className="text-stone-300">
                                ·
                              </span>
                              <span className="text-stone-600">
                                {res.shift} Service
                              </span>
                              <span aria-hidden="true" className="text-stone-300">
                                ·
                              </span>
                              <span className="font-mono-tabular font-medium text-stone-800">
                                {res.partySize} Guests
                              </span>
                              <span aria-hidden="true" className="text-stone-300">
                                ·
                              </span>
                              <span className="font-mono-tabular font-semibold text-stone-900">
                                Table {res.tableName} ({res.tableZone})
                              </span>
                              <span aria-hidden="true" className="text-stone-300">
                                ·
                              </span>
                              <span className={getStatusLabelColor(res.status)}>
                                {res.status}
                              </span>
                              {res.referenceCode && (
                                <>
                                  <span aria-hidden="true" className="text-stone-300">
                                    ·
                                  </span>
                                  <span className="font-mono-tabular text-stone-500">
                                    Ref: {res.referenceCode}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Guest Name & CRM Tags */}
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectGuestById(res.guestId, res.guestName)
                                }
                                className="text-lg font-semibold text-stone-900 hover:text-stone-600 hover:underline transition-colors text-left"
                                title="Click to open guest CRM profile"
                              >
                                {res.guestName}
                              </button>
                              <span className="text-xs font-mono-tabular text-stone-500">
                                {res.guestPhone}
                              </span>
                              {res.guestTags && res.guestTags.length > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-stone-600">
                                  <span aria-hidden="true">·</span>
                                  <span className="font-medium text-stone-800">
                                    {res.guestTags.join(' / ')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Special Requests / Kitchen Note */}
                            {res.specialRequests && (
                              <p className="text-xs text-stone-600 bg-[#FAF9F6] px-3 py-2 rounded-lg border border-stone-200/80">
                                <span className="font-semibold text-stone-800">
                                  Service Note:{' '}
                                </span>
                                {res.specialRequests}
                              </p>
                            )}
                          </div>

                          {/* Right Direct 1-Click Action Buttons + Quick Menu */}
                          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                            {res.status === 'Confirmed' && (
                              <button
                                type="button"
                                onClick={() => onSeatGuest(res.id)}
                                className="px-4 py-2 min-h-[44px] bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Seat Guest</span>
                              </button>
                            )}

                            {res.status === 'Seated' && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onOpenOrderDrawer?.(res.tableId)}
                                  className="px-3.5 py-2 min-h-[44px] bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
                                >
                                  <UtensilsCrossed className="w-3.5 h-3.5" />
                                  <span>
                                    Order {(() => {
                                      const ord = orders.find(
                                        (o) => o.tableId === res.tableId && o.status !== 'settled'
                                      );
                                      return ord ? `(${ord.items.length})` : '';
                                    })()}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onOpenSettleBillModal?.(res.tableId)}
                                  className="px-3.5 py-2 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>
                                    Settle Bill {(() => {
                                      const ord = orders.find(
                                        (o) => o.tableId === res.tableId && o.status !== 'settled'
                                      );
                                      return ord ? `(${formatCurrency(ord.grandTotal)})` : '';
                                    })()}
                                  </span>
                                </button>
                              </div>
                            )}

                            {(res.status === 'Completed' ||
                              res.status === 'No-Show' ||
                              res.status === 'Cancelled') && (
                              <button
                                type="button"
                                onClick={() => onRestoreReservation(res.id)}
                                className="px-3.5 py-2 min-h-[44px] bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore to Confirmed</span>
                              </button>
                            )}

                            {/* Quick Action Menu Trigger */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMenuId(isMenuOpen ? null : res.id)
                                }
                                aria-label="Reservation quick actions"
                                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {isMenuOpen && (
                                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 z-30">
                                  {res.status === 'Seated' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          onOpenOrderDrawer?.(res.tableId);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2"
                                      >
                                        <UtensilsCrossed className="w-3.5 h-3.5 text-stone-500" />
                                        <span>Active Order &amp; KOT</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          onOpenSettleBillModal?.(res.tableId);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-xs text-emerald-800 hover:bg-emerald-50 flex items-center gap-2"
                                      >
                                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Settle Bill &amp; Vacate</span>
                                      </button>
                                      <div className="border-t border-stone-100 my-1"></div>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      onEditReservation(res);
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs text-stone-700 hover:bg-stone-100 flex items-center gap-2"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                                    <span>Edit Booking</span>
                                  </button>

                                  {res.status !== 'No-Show' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        onMarkNoShow(res.id);
                                      }}
                                      className="w-full px-3.5 py-2 text-left text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      <span>Mark No-Show</span>
                                    </button>
                                  )}

                                  {res.status !== 'Cancelled' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        onCancelReservation(res.id);
                                      }}
                                      className="w-full px-3.5 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Cancel Booking</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right 4 Columns: Real-time Table Status Side Panel */}
        <aside
          className={`lg:col-span-4 bg-white border border-stone-200 rounded-xl overflow-hidden ${
            view !== 'floor' && mobileServiceTab === 'bookings' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="px-5 py-4 bg-[#FAF9F6] border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-stone-900">
                Real-Time Table Status
              </h3>
              <p className="text-xs text-stone-500">
                Live occupancy by zone · 1-click quick seat
              </p>
            </div>
            <div className="text-right font-mono-tabular text-xs">
              <span className="text-stone-900 font-semibold">
                {freeTablesCount} Free
              </span>
              <span className="text-stone-400 mx-1">/</span>
              <span className="text-emerald-700 font-semibold">
                {occupiedTablesCount} Seated
              </span>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {ZONES.map((zone) => {
              const zoneTables = tables.filter((t) => t.zone === zone);
              if (zoneTables.length === 0) return null;

              return (
                <div key={zone} className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-stone-500 border-b border-stone-100 pb-1.5">
                    <span className="font-semibold text-stone-800">{zone}</span>
                    <span className="font-mono-tabular">
                      {zoneTables.filter((t) => t.status === 'Free').length} of{' '}
                      {zoneTables.length} free
                    </span>
                  </div>

                  <div className="divide-y divide-stone-100">
                    {zoneTables.map((table) => {
                      const isSeated =
                        table.status === 'Seated' ||
                        table.status === 'Bill Requested';
                      const isBilling = table.status === 'Bill Requested';
                      const activeRes = reservations.find(
                        (r) =>
                          r.id === table.currentReservationId ||
                          (r.tableId === table.id &&
                            r.date === todayDateStr &&
                            r.status === 'Seated')
                      );

                      return (
                        <div
                          key={table.id}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono-tabular font-semibold text-stone-900 text-sm">
                                {table.name}
                              </span>
                              <span className="text-stone-400">·</span>
                              <span className="font-mono-tabular text-stone-600">
                                {table.capacity} pax
                              </span>
                              <span className="text-stone-400">·</span>
                              <span
                                className={
                                  isBilling
                                    ? 'text-blue-700 font-semibold'
                                    : isSeated
                                    ? 'text-emerald-700 font-semibold'
                                    : 'text-stone-600'
                                }
                              >
                                {isBilling
                                  ? 'Billing'
                                  : isSeated
                                  ? 'Seated'
                                  : 'Free'}
                              </span>
                              {readyTickets.some((t) => t.tableId === table.id) && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 animate-pulse">
                                  <Bell className="w-2.5 h-2.5" />
                                  Table {table.name} Order Ready
                                </span>
                              )}
                            </div>

                            {isSeated && activeRes && (
                              <p className="text-xs text-stone-500 truncate mt-0.5">
                                {activeRes.guestName} ({activeRes.partySize}p)
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isSeated ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onOpenOrderDrawer?.(table.id)}
                                  className="px-3.5 py-2 min-h-[44px] bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center active:scale-95"
                                >
                                  Order
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenSettleBillModal?.(table.id)}
                                  className="px-3.5 py-2 min-h-[44px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center active:scale-95"
                                >
                                  Settle
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onQuickSeatTable(table.id)}
                                className="px-4 py-2 min-h-[44px] bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-800 border border-stone-200 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center justify-center active:scale-95"
                              >
                                Quick Seat
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};
