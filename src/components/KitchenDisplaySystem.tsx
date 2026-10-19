import React, { useState, useEffect, useMemo } from 'react';
import {
  KitchenTicket,
  KdsTicketStatus,
  KitchenTicketItem,
  RestaurantTable,
  StaffAccount,
} from '../types';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Bell,
  RefreshCw,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers,
  UtensilsCrossed,
  X,
  ExternalLink,
} from 'lucide-react';

interface KitchenDisplaySystemProps {
  restaurantName: string;
  tickets: KitchenTicket[];
  tables: RestaurantTable[];
  onUpdateTicketStatus: (ticketId: string, status: KdsTicketStatus) => void;
  onToggleItemCompleted: (ticketId: string, itemId: string) => void;
  onNavigateToWaiterPad: () => void;
  onNavigateToHostBoard: () => void;
}

export const KitchenDisplaySystem: React.FC<KitchenDisplaySystemProps> = ({
  restaurantName,
  tickets,
  tables,
  onUpdateTicketStatus,
  onToggleItemCompleted,
  onNavigateToWaiterPad,
  onNavigateToHostBoard,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all_active' | 'pending' | 'preparing' | 'ready' | 'completed'>('all_active');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>('All');

  // Real-time tick every 5 seconds to update elapsed timer badges
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (selectedTableFilter !== 'All' && t.tableName !== selectedTableFilter) {
        return false;
      }
      if (filterStatus === 'all_active') {
        return t.status !== 'completed';
      }
      return t.status === filterStatus;
    });
  }, [tickets, filterStatus, selectedTableFilter]);

  // Statistics
  const activeCount = tickets.filter((t) => t.status !== 'completed').length;
  const pendingCount = tickets.filter((t) => t.status === 'pending').length;
  const preparingCount = tickets.filter((t) => t.status === 'preparing').length;
  const readyCount = tickets.filter((t) => t.status === 'ready').length;
  const completedCount = tickets.filter((t) => t.status === 'completed').length;

  // Calculate elapsed time in minutes from ISO string
  const getElapsedMinutes = (isoString: string) => {
    const diffMs = currentTime - new Date(isoString).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // Timer badge helper: Green (<10m), Amber (10-20m), Red (>20m)
  const renderTimerBadge = (createdAt: string) => {
    const mins = getElapsedMinutes(createdAt);
    let colorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    let urgencyLabel = 'On Time';

    if (mins >= 20) {
      colorClass = 'bg-rose-500/30 text-rose-300 border-rose-500/50 animate-pulse';
      urgencyLabel = 'URGENT';
    } else if (mins >= 10) {
      colorClass = 'bg-amber-500/30 text-amber-300 border-amber-500/50';
      urgencyLabel = 'Attention';
    }

    return (
      <div
        className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${colorClass}`}
        title={`Elapsed: ${mins} minutes (${urgencyLabel})`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>{mins}m elapsed</span>
      </div>
    );
  };

  // Play audio chime simulation
  const handleSimulateChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext fallback
    }
  };

  return (
    <div className="bg-[#121212] text-stone-100 min-h-[800px] rounded-3xl p-4 sm:p-6 shadow-2xl border border-stone-800 space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. KDS TOP HEADER BAR (HIGH CONTRAST DARK MODE)               */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-md">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-serif-display tracking-tight text-white">
                Kitchen Display System (KDS)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                LIVE QUEUE
              </span>
            </div>
            <p className="text-xs text-stone-400">
              {restaurantName} · Kitchen Order Tickets (KOT) workflow &amp; item dispatch
            </p>
          </div>
        </div>

        {/* Quick KDS Metric Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-700 text-xs flex items-center gap-2">
            <span className="text-stone-400">Active Queue:</span>
            <span className="font-bold text-white font-mono-tabular">{activeCount} KOTs</span>
          </div>

          <div className="bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-700 text-xs flex items-center gap-2">
            <span className="text-amber-400">Preparing:</span>
            <span className="font-bold text-amber-300 font-mono-tabular">{preparingCount}</span>
          </div>

          <div className="bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-700 text-xs flex items-center gap-2">
            <span className="text-emerald-400">Ready for Pickup:</span>
            <span className="font-bold text-emerald-300 font-mono-tabular">{readyCount}</span>
          </div>

          {/* Audio Chime toggle */}
          <button
            type="button"
            onClick={() => {
              if (!soundEnabled) handleSimulateChime();
              setSoundEnabled(!soundEnabled);
            }}
            title={soundEnabled ? 'Kitchen Chime Enabled (Tap to mute)' : 'Kitchen Chime Muted'}
            className={`p-2 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-stone-800 text-stone-500 border-stone-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Quick Nav Switchers */}
          <button
            type="button"
            onClick={onNavigateToWaiterPad}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border border-stone-700 min-h-[38px]"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
            <span>Waiter Pad</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToHostBoard}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border border-stone-700 min-h-[38px]"
          >
            <Layers className="w-3.5 h-3.5 text-stone-300" />
            <span>Host Board</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. FILTER STRIP: Status tabs + Table selector                 */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-stone-900/60 p-3 rounded-2xl border border-stone-800 flex flex-wrap items-center justify-between gap-3">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterStatus('all_active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'all_active'
                ? 'bg-white text-stone-950 shadow-md font-bold'
                : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
            }`}
          >
            Active Tickets ({activeCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterStatus === 'pending'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>New / Pending ({pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('preparing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterStatus === 'preparing'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Preparing ({preparingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('ready')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterStatus === 'ready'
                ? 'bg-emerald-600 text-white font-bold shadow-md'
                : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Bell className="w-3 h-3 text-emerald-300" />
            <span>Ready for Pickup ({readyCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterStatus === 'completed'
                ? 'bg-stone-700 text-white font-bold shadow-md'
                : 'bg-stone-800/80 text-stone-400 hover:bg-stone-700'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-stone-400" />
            <span>Completed / History ({completedCount})</span>
          </button>
        </div>

        {/* Table Selector Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Table:</span>
          <select
            value={selectedTableFilter}
            onChange={(e) => setSelectedTableFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-stone-800 border border-stone-700 rounded-xl text-white font-medium focus:outline-none"
          >
            <option value="All">All Tables</option>
            {tables.map((t) => (
              <option key={t.id} value={t.name}>
                Table {t.name} ({t.zone})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TICKET GRID (MASONRY / CARDS OF LIVE KOTs)                 */}
      {/* ------------------------------------------------------------- */}
      {filteredTickets.length === 0 ? (
        <div className="bg-stone-900/40 border-2 border-dashed border-stone-800 rounded-3xl p-16 text-center space-y-4">
          <ChefHat className="w-12 h-12 text-stone-600 mx-auto" />
          <h3 className="text-lg font-bold text-stone-300 font-serif-display">
            Kitchen queue is clear!
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            No tickets match the &ldquo;{filterStatus}&rdquo; filter. When floor waiters dispatch a
            ticket from the Waiter Pad, it will appear here immediately with live timers and cooking
            instructions.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onNavigateToWaiterPad}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-md"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Go to Waiter Pad &amp; Take Order</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {filteredTickets.map((ticket) => {
            const isPending = ticket.status === 'pending';
            const isPreparing = ticket.status === 'preparing';
            const isReady = ticket.status === 'ready';
            const isCompleted = ticket.status === 'completed';

            const allItemsCooked = ticket.items.every((it) => it.completed);

            // Card border & header styling based on status
            let cardBorder = 'border-stone-800';
            let headerBg = 'bg-stone-800/80';
            if (isReady) {
              cardBorder = 'border-emerald-500 ring-2 ring-emerald-500/30';
              headerBg = 'bg-emerald-950/80';
            } else if (isPreparing) {
              cardBorder = 'border-indigo-500/80 ring-1 ring-indigo-500/20';
              headerBg = 'bg-indigo-950/80';
            } else if (isPending) {
              cardBorder = 'border-amber-500/80 ring-1 ring-amber-500/20';
              headerBg = 'bg-amber-950/70';
            }

            return (
              <div
                key={ticket.id}
                className={`bg-stone-900 rounded-2xl border ${cardBorder} shadow-xl overflow-hidden flex flex-col justify-between transition-all`}
              >
                {/* TICKET HEADER */}
                <div className={`p-4 border-b border-stone-800 ${headerBg} space-y-2`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold font-mono tracking-tight text-white">
                        Table {ticket.tableName}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400 bg-stone-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                        {ticket.kotNumber}
                      </span>
                    </div>

                    {renderTimerBadge(ticket.createdAt)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-400 pt-1 font-mono">
                    <span>
                      Waiter: <strong className="text-stone-200">{ticket.waiterName}</strong>
                    </span>
                    <span>
                      {ticket.guestName} ({ticket.partySize || 2}p)
                    </span>
                  </div>
                </div>

                {/* TICKET ITEM LIST */}
                <div className="p-4 space-y-2.5 divide-y divide-stone-800/60 flex-1">
                  {ticket.items.map((it) => {
                    const isItemCooked = it.completed;

                    return (
                      <div
                        key={it.id}
                        onClick={() => onToggleItemCompleted(ticket.id, it.id)}
                        className={`pt-2.5 first:pt-0 cursor-pointer select-none group transition-opacity ${
                          isItemCooked ? 'opacity-40' : 'opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {/* Checkbox circle for cook completion */}
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isItemCooked
                                  ? 'bg-emerald-600 border-emerald-500 text-white'
                                  : 'border-stone-700 bg-stone-800 group-hover:border-stone-500'
                              }`}
                            >
                              {isItemCooked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-base font-bold font-mono text-amber-400">
                                  {it.quantity}x
                                </span>
                                <span
                                  className={`text-sm font-semibold text-white truncate ${
                                    isItemCooked ? 'line-through text-stone-500' : ''
                                  }`}
                                >
                                  {it.name}
                                </span>
                              </div>

                              {/* Dietary type tag */}
                              {it.dietary && (
                                <span className="inline-block text-[10px] text-stone-500 font-mono">
                                  {it.dietary}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Special Cooking Instructions Callout */}
                        {it.notes && (
                          <div className="mt-1.5 ml-7 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-start gap-1.5 leading-snug">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>
                              <strong className="text-amber-200">Note: </strong>
                              {it.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* TICKET FOOTER & STATUS ACTION BUTTONS */}
                <div className="p-3 bg-stone-950 border-t border-stone-800 space-y-2">
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between text-xs font-mono px-1">
                    <span className="text-stone-500">Status:</span>
                    <span
                      className={`font-bold uppercase tracking-wider ${
                        isReady
                          ? 'text-emerald-400'
                          : isPreparing
                          ? 'text-indigo-400'
                          : isCompleted
                          ? 'text-stone-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  {/* Transition Buttons */}
                  <div className="grid grid-cols-1 gap-1.5">
                    {isPending && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (soundEnabled) handleSimulateChime();
                            onUpdateTicketStatus(ticket.id, 'preparing');
                          }}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1 min-h-[44px] cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5 text-stone-950 shrink-0" />
                          <span>Start Prep</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (soundEnabled) handleSimulateChime();
                            onUpdateTicketStatus(ticket.id, 'ready');
                          }}
                          className={`w-full py-2.5 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1 min-h-[44px] cursor-pointer ${
                            allItemsCooked
                              ? 'bg-emerald-600 hover:bg-emerald-500 animate-pulse'
                              : 'bg-indigo-600 hover:bg-indigo-500'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5 shrink-0" />
                          <span>Mark Ready</span>
                        </button>
                      </div>
                    )}

                    {isPreparing && (
                      <button
                        type="button"
                        onClick={() => {
                          if (soundEnabled) handleSimulateChime();
                          onUpdateTicketStatus(ticket.id, 'ready');
                        }}
                        className={`w-full py-2.5 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                          allItemsCooked
                            ? 'bg-emerald-600 hover:bg-emerald-500 animate-pulse'
                            : 'bg-indigo-600 hover:bg-indigo-500'
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                        <span>
                          {allItemsCooked ? 'All Cooked — Mark Ready!' : 'Mark Ready'}
                        </span>
                      </button>
                    )}

                    {isReady && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateTicketStatus(ticket.id, 'completed');
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[44px]"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Picked Up &amp; Completed (Bump)</span>
                      </button>
                    )}

                    {isCompleted && (
                      <button
                        type="button"
                        onClick={() => onUpdateTicketStatus(ticket.id, 'preparing')}
                        className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 min-h-[38px]"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Recall to Kitchen Queue</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
