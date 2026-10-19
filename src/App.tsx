import React, { useState, useEffect } from 'react';
import {
  RestaurantProfile,
  RestaurantTable,
  GuestProfile,
  Reservation,
  PrimaryTab,
  ServiceBoardView,
  ShiftFilter,
  ServiceShift,
  SeatingPreference,
  SpecialOccasion,
  MenuItem,
  TableOrder,
  PaymentMode,
  GuestFeedback,
  KitchenTicket,
  KdsTicketStatus,
  Ingredient,
  RecipeIngredientItem,
  InventoryMovement,
} from './types';
import {
  INITIAL_RESTAURANTS,
  INITIAL_TABLES,
  INITIAL_GUESTS,
  INITIAL_RESERVATIONS,
  INITIAL_MENU_ITEMS,
  INITIAL_ORDERS,
  INITIAL_FEEDBACKS,
  INITIAL_KITCHEN_TICKETS,
  INITIAL_STAFF_ACCOUNTS,
  INITIAL_INGREDIENTS,
  INITIAL_INVENTORY_MOVEMENTS,
} from './data/seedData';
import {
  getTodayDateString,
  alignSeedReservationsWithToday,
  alignSeedOrdersWithToday,
} from './utils/date';
import { formatCurrency } from './utils/currency';
import {
  convertUnitQuantity,
  evaluateDishStock,
  syncMenuAvailabilityWithInventory,
} from './utils/inventory';
import { OnboardingView } from './components/OnboardingModal';
import {
  BookTableModal,
  QuickWalkInModal,
  AddGuestModal,
} from './components/ActionModals';
import { ServiceBoard } from './components/ServiceBoard';
import { GuestDirectory } from './components/GuestDirectory';
import { PublicBookingPortal } from './components/PublicBookingPortal';
import { DigitalMenuManagement } from './components/DigitalMenuManagement';
import { InventoryManagement } from './components/InventoryManagement';
import { TableOrderDrawer } from './components/TableOrderDrawer';
import { BillSettlementModal } from './components/BillSettlementModal';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { AiMenuDigitizerModal } from './components/AiMenuDigitizerModal';
import { MarketingRetention } from './components/MarketingRetention';
import { DailyShiftSummary } from './components/DailyShiftSummary';
import { RestaurantSettings } from './components/RestaurantSettings';
import { WaiterOrderPad } from './components/WaiterOrderPad';
import { KitchenDisplaySystem } from './components/KitchenDisplaySystem';
import {
  CalendarPlus,
  UserPlus,
  UtensilsCrossed,
  CheckCircle2,
  Building2,
  Clock,
  RotateCcw,
  ExternalLink,
  Eye,
  Menu as MenuIcon,
  Calendar,
  Users,
  LayoutGrid,
  SlidersHorizontal,
  ChevronDown,
  Plus,
  X,
  FileText,
  Megaphone,
  Settings,
  ChefHat,
  Bell,
  Layers,
  Package,
} from 'lucide-react';

import { useAppStore, STORAGE_KEY } from './store/useAppStore';

export default function App() {
  const TODAY_DATE = getTodayDateString();

  // Centralized Application Store (Tables, Orders, Inventory, Recipes, SettledChecks, CRM, KDS)
  const {
    restaurants,
    setRestaurants,
    activeRestaurantId,
    setActiveRestaurantId,
    tables,
    setTables,
    guests,
    setGuests,
    reservations,
    setReservations,
    menuItems,
    setMenuItems,
    ingredients,
    setIngredients,
    inventoryMovements,
    setInventoryMovements,
    tableOrders,
    setTableOrders,
    feedbacks,
    setFeedbacks,
    kitchenTickets,
    setKitchenTickets,
    settledChecks,
  } = useAppStore();

  const [activeWaiterName, setActiveWaiterName] = useState<string>('Antoine Dupuis');

  // Navigation & Route detection (/book, /menu, /inventory, /marketing, /reports/daily, /settings, /waiter, /kitchen)
  const [activeTab, setActiveTab] = useState<PrimaryTab>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path === '/book' || path.startsWith('/book/') || search.includes('view=book')) {
        return 'portal';
      }
      if (path === '/waiter' || path.startsWith('/waiter/') || search.includes('view=waiter')) {
        return 'waiter';
      }
      if (path === '/kitchen' || path.startsWith('/kitchen/') || search.includes('view=kitchen')) {
        return 'kitchen';
      }
      if (path === '/menu' || path.startsWith('/menu/') || search.includes('view=menu')) {
        return 'menu';
      }
      if (
        path === '/inventory' ||
        path.startsWith('/inventory/') ||
        search.includes('view=inventory')
      ) {
        return 'inventory';
      }
      if (path === '/marketing' || path.startsWith('/marketing/') || search.includes('view=marketing')) {
        return 'marketing';
      }
      if (
        path === '/reports' ||
        path.startsWith('/reports/') ||
        path === '/reports/daily' ||
        search.includes('view=reports')
      ) {
        return 'reports';
      }
      if (path === '/settings' || path.startsWith('/settings/') || search.includes('view=settings')) {
        return 'settings';
      }
    }
    return 'service';
  });

  const navigateToTab = (tab: PrimaryTab) => {
    setActiveTab(tab);
    try {
      if (tab === 'portal') {
        window.history.pushState({}, '', '/book');
      } else if (tab === 'waiter') {
        window.history.pushState({}, '', '/waiter');
      } else if (tab === 'kitchen') {
        window.history.pushState({}, '', '/kitchen');
      } else if (tab === 'menu') {
        window.history.pushState({}, '', '/menu');
      } else if (tab === 'inventory') {
        window.history.pushState({}, '', '/inventory');
      } else if (tab === 'marketing') {
        window.history.pushState({}, '', '/marketing');
      } else if (tab === 'reports') {
        window.history.pushState({}, '', '/reports/daily');
      } else if (tab === 'settings') {
        window.history.pushState({}, '', '/settings');
      } else if (
        window.location.pathname.startsWith('/book') ||
        window.location.pathname.startsWith('/waiter') ||
        window.location.pathname.startsWith('/kitchen') ||
        window.location.pathname.startsWith('/menu') ||
        window.location.pathname.startsWith('/inventory') ||
        window.location.pathname.startsWith('/marketing') ||
        window.location.pathname.startsWith('/reports') ||
        window.location.pathname.startsWith('/settings')
      ) {
        window.history.pushState({}, '', '/');
      }
    } catch {}
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/book' || path.startsWith('/book/')) {
        setActiveTab('portal');
      } else if (path === '/waiter' || path.startsWith('/waiter/')) {
        setActiveTab('waiter');
      } else if (path === '/kitchen' || path.startsWith('/kitchen/')) {
        setActiveTab('kitchen');
      } else if (path === '/menu' || path.startsWith('/menu/')) {
        setActiveTab('menu');
      } else if (path === '/inventory' || path.startsWith('/inventory/')) {
        setActiveTab('inventory');
      } else if (path === '/marketing' || path.startsWith('/marketing/')) {
        setActiveTab('marketing');
      } else if (path === '/reports' || path.startsWith('/reports/') || path === '/reports/daily') {
        setActiveTab('reports');
      } else if (path === '/settings' || path.startsWith('/settings/')) {
        setActiveTab('settings');
      } else {
        setActiveTab('service');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [serviceView, setServiceView] = useState<ServiceBoardView>('today');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');
  const [currentServiceShift, setCurrentServiceShift] =
    useState<ServiceShift>('Lunch');
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [showSetupBanner, setShowSetupBanner] = useState<boolean>(() => {
    try {
      return localStorage.getItem('maison_setup_banner_dismissed_v1') !== 'true';
    } catch {
      return false;
    }
  });
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Modals & Slide-Over States
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);

  // Active Order Drawer, Settlement Modal & Thermal Print Modal State
  const [activeDrawerTableId, setActiveDrawerTableId] = useState<string | null>(null);
  const [activeSettlementTableId, setActiveSettlementTableId] = useState<string | null>(null);
  const [thermalPrintState, setThermalPrintState] = useState<{
    orderId: string;
    mode: 'bill' | 'kot';
  } | null>(null);
  const [isAiMenuDigitizerOpen, setIsAiMenuDigitizerOpen] = useState(false);

  const [modalInitialGuest, setModalInitialGuest] =
    useState<GuestProfile | null>(null);
  const [modalInitialTableId, setModalInitialTableId] = useState<
    string | undefined
  >(undefined);
  const [editingReservation, setEditingReservation] =
    useState<Reservation | null>(null);
  const [selectedCrmGuestId, setSelectedCrmGuestId] = useState<string | null>(
    null
  );

  // Toast feedback banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Active Restaurant Scoped Entities
  const activeRestaurant =
    restaurants.find((r) => r.id === activeRestaurantId) || restaurants[0];
  const restaurantTables = tables.filter(
    (t) => t.restaurantId === activeRestaurant.id
  );
  const restaurantGuests = guests.filter(
    (g) => g.restaurantId === activeRestaurant.id
  );
  const restaurantReservations = reservations.filter(
    (r) => r.restaurantId === activeRestaurant.id
  );
  const restaurantMenuItems = menuItems.filter(
    (m) => m.restaurantId === activeRestaurant.id
  );
  const restaurantIngredients = ingredients.filter(
    (ing) => ing.restaurantId === activeRestaurant.id
  );
  const restaurantMovements = inventoryMovements.filter(
    (mov) => mov.restaurantId === activeRestaurant.id
  );
  const restaurantOrders = tableOrders.filter(
    (o) => o.restaurantId === activeRestaurant.id
  );

  // Handlers for Restaurant & Onboarding
  const handleUpdateRestaurant = (updated: Partial<RestaurantProfile>) => {
    setRestaurants((prev) =>
      prev.map((r) =>
        r.id === activeRestaurant.id ? { ...r, ...updated } : r
      )
    );
    triggerToast(`Updated settings for ${updated.name || activeRestaurant.name}`);
  };

  const handleCreateNewRestaurant = () => {
    const newId = `rest-${Date.now()}`;
    const newRest: RestaurantProfile = {
      id: newId,
      name: 'Nouvelle Maison',
      cuisine: 'Modern French Bistro & Wine Bar',
      city: 'Bengaluru',
      state: 'Karnataka',
      slug: 'nouvelle-maison-blr',
      lunchStart: '12:00 PM',
      lunchEnd: '4:00 PM',
      dinnerStart: '7:00 PM',
      dinnerEnd: '11:30 PM',
      onboardingCompleted: false,
      address: '100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038',
      phone: '+91 80 4123 9900',
      currencySymbol: '₹',
      gstin: '29AAAAA0000A1Z5',
      fssaiNumber: '11222003000456',
      upiId: 'nouvellemaison@icici',
      taxRate: 0.05,
      serviceChargeEnabled: true,
      serviceChargeRate: 0.05,
      serviceChargeNote: 'Discretionary / Voluntary',
    };
    const starterTables: RestaurantTable[] = [
      {
        id: `tbl-${Date.now()}-1`,
        restaurantId: newId,
        name: 'T1',
        zone: 'Main Hall',
        capacity: 2,
        status: 'Free',
      },
      {
        id: `tbl-${Date.now()}-2`,
        restaurantId: newId,
        name: 'T2',
        zone: 'Main Hall',
        capacity: 4,
        status: 'Free',
      },
    ];
    setRestaurants((prev) => [...prev, newRest]);
    setTables((prev) => [...prev, ...starterTables]);
    setActiveRestaurantId(newId);
    setOnboardingStep(1);
    navigateToTab('onboarding');
    triggerToast('Created new restaurant — complete the 3-step Setup Guide');
  };

  const handleAddTable = (
    newTableData: Omit<RestaurantTable, 'id' | 'restaurantId' | 'status'>
  ) => {
    const created: RestaurantTable = {
      ...newTableData,
      id: `tbl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      restaurantId: activeRestaurant.id,
      status: 'Free',
    };
    setTables((prev) => [...prev, created]);
    triggerToast(
      `Added Table ${created.name} (${created.capacity} pax) to ${created.zone}`
    );
  };

  const handleDeleteTable = (tableId: string) => {
    const target = tables.find((t) => t.id === tableId);
    if (!target || target.status === 'Seated') return;
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    triggerToast(`Removed Table ${target.name}`);
  };

  // Seating guest handler
  const handleSeatGuest = (reservationId: string) => {
    const target = reservations.find((r) => r.id === reservationId);
    if (!target) return;

    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId
          ? {
              ...r,
              status: 'Seated',
              seatedAt: new Date().toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              }),
            }
          : r
      )
    );

    setTables((prev) =>
      prev.map((t) =>
        t.id === target.tableId
          ? { ...t, status: 'Seated', currentReservationId: reservationId }
          : t
      )
    );

    // Initialize an empty active order for this table if none exists
    const existingOrder = tableOrders.find(
      (o) => o.tableId === target.tableId && o.status !== 'settled'
    );
    if (!existingOrder) {
      const newOrder: TableOrder = {
        id: `order-${target.tableId}-${Date.now()}`,
        restaurantId: activeRestaurant.id,
        tableId: target.tableId,
        tableName: target.tableName,
        reservationId: target.id,
        guestId: target.guestId,
        guestName: target.guestName,
        guestPhone: target.guestPhone,
        partySize: target.partySize,
        kotCount: 0,
        kotList: [],
        items: [],
        taxRate: 0.05,
        discountType: 'none',
        discountValue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        grandTotal: 0,
      };
      setTableOrders((prev) => [...prev, newOrder]);
    }

    triggerToast(
      `Seated ${target.guestName} (${target.partySize} guests) at Table ${target.tableName} · Active order created`
    );
  };

  const handleCompleteDining = (reservationId: string) => {
    const target = reservations.find((r) => r.id === reservationId);
    if (!target) return;

    // Check if there is an active table order
    const tableOrder = tableOrders.find(
      (o) => o.tableId === target.tableId && o.status !== 'settled'
    );
    const visitSpend = tableOrder?.grandTotal || target.estimatedSpend || target.partySize * 95;

    // 1. Update reservation to Completed
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId
          ? {
              ...r,
              status: 'Completed',
              completedAt: new Date().toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              }),
            }
          : r
      )
    );

    // 2. Free the assigned table
    setTables((prev) =>
      prev.map((t) =>
        t.id === target.tableId
          ? { ...t, status: 'Free', currentReservationId: undefined }
          : t
      )
    );

    // 3. Close the active order if any
    if (tableOrder) {
      setTableOrders((prev) =>
        prev.map((o) =>
          o.id === tableOrder.id
            ? { ...o, status: 'settled', settledAt: new Date().toISOString() }
            : o
        )
      );
    }

    // 4. Increment guest's visit count, update lastVisited, and log in history
    setGuests((prev) =>
      prev.map((g) => {
        if (
          g.id === target.guestId ||
          g.name.toLowerCase() === target.guestName.toLowerCase()
        ) {
          const newTotalVisits = g.totalVisits + 1;
          return {
            ...g,
            totalVisits: newTotalVisits,
            lastVisited: TODAY_DATE,
            lifetimeSpend: g.lifetimeSpend + visitSpend,
            history: [
              {
                id: `vh-${Date.now()}`,
                date: target.date,
                time: target.time,
                shift: target.shift,
                tableName: target.tableName,
                partySize: target.partySize,
                status: 'Completed',
                spend: visitSpend,
                notes: target.specialRequests || 'Completed service visit',
              },
              ...g.history,
            ],
          };
        }
        return g;
      })
    );

    triggerToast(
      `Completed dining for ${target.guestName} · Table ${target.tableName} is now Free · Visit count incremented`
    );
  };

  const handleCompleteDiningByTable = (tableId: string) => {
    const activeRes = reservations.find(
      (r) =>
        r.restaurantId === activeRestaurant.id &&
        r.tableId === tableId &&
        r.status === 'Seated'
    );
    if (activeRes) {
      handleCompleteDining(activeRes.id);
    } else {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? { ...t, status: 'Free', currentReservationId: undefined }
            : t
        )
      );
      setTableOrders((prev) =>
        prev.map((o) =>
          o.tableId === tableId && o.status === 'active'
            ? { ...o, status: 'settled', settledAt: new Date().toISOString() }
            : o
        )
      );
      triggerToast('Table marked Free');
    }
  };

  const handleMarkNoShow = (reservationId: string) => {
    const target = reservations.find((r) => r.id === reservationId);
    if (!target) return;

    setReservations((prev) =>
      prev.map((r) => (r.id === reservationId ? { ...r, status: 'No-Show' } : r))
    );

    setTables((prev) =>
      prev.map((t) =>
        t.id === target.tableId && t.currentReservationId === reservationId
          ? { ...t, status: 'Free', currentReservationId: undefined }
          : t
      )
    );

    triggerToast(`Marked ${target.guestName} as No-Show`);
  };

  const handleCancelReservation = (reservationId: string) => {
    const target = reservations.find((r) => r.id === reservationId);
    if (!target) return;

    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId ? { ...r, status: 'Cancelled' } : r
      )
    );

    setTables((prev) =>
      prev.map((t) =>
        t.id === target.tableId && t.currentReservationId === reservationId
          ? { ...t, status: 'Free', currentReservationId: undefined }
          : t
      )
    );

    triggerToast(`Cancelled booking for ${target.guestName}`);
  };

  const handleRestoreReservation = (reservationId: string) => {
    const target = reservations.find((r) => r.id === reservationId);
    if (!target) return;

    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId ? { ...r, status: 'Confirmed' } : r
      )
    );
    triggerToast(`Restored ${target.guestName} to Confirmed`);
  };

  // Normalize phone digits for reliable CRM matching
  const normalizePhoneDigits = (phone: string) => {
    const digits = phone.replace(/[^0-9]/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };

  // Save Booking (from Host Stand Modal OR from Public /book Portal)
  const handleSaveBooking = (bookingData: {
    id?: string;
    referenceCode?: string;
    date: string;
    time: string;
    shift: ServiceShift;
    partySize: number;
    tableId: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    seatingPreference?: SeatingPreference;
    occasion?: SpecialOccasion;
    specialRequests: string;
  }) => {
    const selectedTable =
      restaurantTables.find((t) => t.id === bookingData.tableId) ||
      restaurantTables[0];
    if (!selectedTable) return;

    const incomingDigits = normalizePhoneDigits(bookingData.guestPhone);

    // Match by phone number first, then by exact name
    let matchingGuest = restaurantGuests.find((g) => {
      const gDigits = normalizePhoneDigits(g.phone);
      return (
        (incomingDigits.length >= 7 && gDigits === incomingDigits) ||
        g.name.toLowerCase() === bookingData.guestName.toLowerCase()
      );
    });

    if (!matchingGuest) {
      // Automatically create a new guest profile with the "New Guest" tag
      const newGuest: GuestProfile = {
        id: `gst-${Date.now()}`,
        restaurantId: activeRestaurant.id,
        name: bookingData.guestName,
        phone: bookingData.guestPhone,
        email: bookingData.guestEmail,
        totalVisits: 0,
        lastVisited: bookingData.date,
        lifetimeSpend: 0,
        averagePartySize: bookingData.partySize,
        tags: ['New Guest'],
        dietaryRestrictions: bookingData.specialRequests || 'None',
        allergyWarnings: 'No known allergies',
        personalNotes: bookingData.specialRequests
          ? `Online booking note: ${bookingData.specialRequests}`
          : 'Created automatically via reservation booking.',
        preferredZone: selectedTable.zone,
        history: [],
      };
      setGuests((prev) => [newGuest, ...prev]);
      matchingGuest = newGuest;
    } else if (bookingData.specialRequests) {
      // Update existing guest notes if new requests were added
      const existingId = matchingGuest.id;
      setGuests((prev) =>
        prev.map((g) =>
          g.id === existingId
            ? {
                ...g,
                email: bookingData.guestEmail || g.email,
                personalNotes: g.personalNotes
                  ? `${g.personalNotes} | Latest booking: ${bookingData.specialRequests}`
                  : bookingData.specialRequests,
              }
            : g
        )
      );
    }

    if (bookingData.id) {
      // Editing existing reservation
      setReservations((prev) =>
        prev.map((r) =>
          r.id === bookingData.id
            ? {
                ...r,
                date: bookingData.date,
                time: bookingData.time,
                shift: bookingData.shift,
                partySize: bookingData.partySize,
                tableId: selectedTable.id,
                tableName: selectedTable.name,
                tableZone: selectedTable.zone,
                guestName: bookingData.guestName,
                guestPhone: bookingData.guestPhone,
                guestEmail: bookingData.guestEmail,
                specialRequests: bookingData.specialRequests,
              }
            : r
        )
      );
      triggerToast(`Updated reservation for ${bookingData.guestName}`);
    } else {
      const newRes: Reservation = {
        id: `res-${Date.now()}`,
        referenceCode:
          bookingData.referenceCode ||
          `MSN-${Math.floor(1000 + Math.random() * 9000)}`,
        restaurantId: activeRestaurant.id,
        guestId: matchingGuest.id,
        guestName: bookingData.guestName,
        guestPhone: bookingData.guestPhone,
        guestEmail: bookingData.guestEmail,
        guestTags: matchingGuest.tags,
        date: bookingData.date,
        time: bookingData.time,
        shift: bookingData.shift,
        partySize: bookingData.partySize,
        tableId: selectedTable.id,
        tableName: selectedTable.name,
        tableZone: selectedTable.zone,
        status: 'Confirmed',
        specialRequests: bookingData.specialRequests,
        seatingPreference: bookingData.seatingPreference,
        occasion: bookingData.occasion,
        bookedVia: bookingData.referenceCode ? 'Public Portal' : 'Host Stand',
        createdAt: new Date().toISOString(),
        estimatedSpend: bookingData.partySize * 95,
      };
      setReservations((prev) => [newRes, ...prev]);

      if (bookingData.date > TODAY_DATE) {
        setServiceView('upcoming');
      } else {
        setServiceView('today');
      }
      setShiftFilter('all');

      triggerToast(
        `Reservation ${newRes.referenceCode} confirmed for ${bookingData.guestName} · Synced to Live Service Board`
      );
    }
  };

  // Quick Walk-in Handler
  const handleSeatWalkIn = (data: {
    partySize: number;
    tableId: string;
    guestName: string;
    guestPhone?: string;
    notes?: string;
    shift: ServiceShift;
  }) => {
    const selectedTable = restaurantTables.find((t) => t.id === data.tableId);
    if (!selectedTable) return;

    const nowTime = data.shift === 'Lunch' ? '1:15 PM' : '7:45 PM';

    let guestId = `gst-walkin-${Date.now()}`;
    let guestTags: string[] = [];

    if (data.guestName !== 'Walk-in Guest' || data.guestPhone) {
      const existing = restaurantGuests.find(
        (g) =>
          g.name.toLowerCase() === data.guestName.toLowerCase() ||
          (data.guestPhone &&
            normalizePhoneDigits(g.phone) ===
              normalizePhoneDigits(data.guestPhone))
      );
      if (existing) {
        guestId = existing.id;
        guestTags = existing.tags;
      } else {
        const createdGuest: GuestProfile = {
          id: guestId,
          restaurantId: activeRestaurant.id,
          name: data.guestName,
          phone: data.guestPhone || '+1 (212) 555-0100',
          totalVisits: 0,
          lastVisited: TODAY_DATE,
          lifetimeSpend: 0,
          averagePartySize: data.partySize,
          tags: ['New Guest'],
          dietaryRestrictions: 'None',
          allergyWarnings: 'No known allergies',
          personalNotes: data.notes || 'Joined via walk-in service.',
          preferredZone: selectedTable.zone,
          history: [],
        };
        setGuests((prev) => [createdGuest, ...prev]);
        guestTags = createdGuest.tags;
      }
    }

    const newResId = `res-walkin-${Date.now()}`;
    const walkInRes: Reservation = {
      id: newResId,
      restaurantId: activeRestaurant.id,
      guestId,
      guestName: data.guestName,
      guestPhone: data.guestPhone || 'Walk-in',
      guestTags,
      date: TODAY_DATE,
      time: nowTime,
      shift: data.shift,
      partySize: data.partySize,
      tableId: selectedTable.id,
      tableName: selectedTable.name,
      tableZone: selectedTable.zone,
      status: 'Seated',
      specialRequests: data.notes || 'Walk-in party seated immediately',
      createdAt: new Date().toISOString(),
      seatedAt: nowTime,
      estimatedSpend: data.partySize * 85,
    };

    setReservations((prev) => [walkInRes, ...prev]);
    setTables((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id
          ? { ...t, status: 'Seated', currentReservationId: newResId }
          : t
      )
    );

    // Initialize an active order for this walk-in
    const newOrder: TableOrder = {
      id: `order-${selectedTable.id}-${Date.now()}`,
      restaurantId: activeRestaurant.id,
      tableId: selectedTable.id,
      tableName: selectedTable.name,
      reservationId: newResId,
      guestId,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      partySize: data.partySize,
      kotCount: 0,
      kotList: [],
      items: [],
      taxRate: 0.05,
      discountType: 'none',
      discountValue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      grandTotal: 0,
    };
    setTableOrders((prev) => [...prev, newOrder]);

    triggerToast(
      `Seated walk-in (${data.guestName}, ${data.partySize} pax) at Table ${selectedTable.name} · Active order created`
    );
  };

  // Add Guest Handler
  const handleAddGuest = (guestData: {
    name: string;
    phone: string;
    email?: string;
    tags: string[];
    dietaryRestrictions: string;
    allergyWarnings: string;
    personalNotes: string;
  }) => {
    const newGuest: GuestProfile = {
      id: `gst-${Date.now()}`,
      restaurantId: activeRestaurant.id,
      name: guestData.name,
      phone: guestData.phone,
      email: guestData.email,
      totalVisits: 1,
      lastVisited: TODAY_DATE,
      lifetimeSpend: 180,
      averagePartySize: 2,
      tags: guestData.tags,
      dietaryRestrictions: guestData.dietaryRestrictions,
      allergyWarnings: guestData.allergyWarnings,
      personalNotes: guestData.personalNotes,
      history: [
        {
          id: `vh-${Date.now()}`,
          date: TODAY_DATE,
          time: '7:30 PM',
          shift: 'Dinner',
          tableName: 'T1',
          partySize: 2,
          status: 'Completed',
          spend: 180,
          notes: 'Initial profile registration',
        },
      ],
    };
    setGuests((prev) => [newGuest, ...prev]);
    setSelectedCrmGuestId(newGuest.id);
    triggerToast(`Added ${newGuest.name} to Guest CRM Directory`);
  };

  const handleUpdateGuest = (
    guestId: string,
    updated: Partial<GuestProfile>
  ) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, ...updated } : g))
    );
    triggerToast('Saved guest hospitality profile');
  };

  const handleSelectGuestFromServiceBoard = (
    guestId: string,
    fallbackName?: string
  ) => {
    const found =
      restaurantGuests.find((g) => g.id === guestId) ||
      (fallbackName
        ? restaurantGuests.find(
            (g) => g.name.toLowerCase() === fallbackName.toLowerCase()
          )
        : undefined);
    if (found) {
      setSelectedCrmGuestId(found.id);
      navigateToTab('guests');
    } else {
      triggerToast('Walk-in guest has no full CRM dossier yet');
    }
  };

  // Digital Menu Handlers
  const handleAddMenuItem = (newItemData: Omit<MenuItem, 'id' | 'restaurantId'>) => {
    const newItem: MenuItem = {
      ...newItemData,
      id: `menu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      restaurantId: activeRestaurant.id,
    };
    setMenuItems((prev) => [newItem, ...prev]);
    triggerToast(`Added "${newItem.name}" to digital menu`);
  };

  const handleBulkAddMenuItems = (
    itemsToImport: Array<Omit<MenuItem, 'id' | 'restaurantId'>>
  ) => {
    const now = Date.now();
    const createdItems: MenuItem[] = itemsToImport.map((item, idx) => ({
      ...item,
      id: `menu-ai-${now}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      restaurantId: activeRestaurant.id,
    }));
    setMenuItems((prev) => [...createdItems, ...prev]);
    triggerToast(
      `✨ Imported ${createdItems.length} AI-digitized dish${
        createdItems.length === 1 ? '' : 'es'
      } to live catalog · Available on /menu, Waiter Pad & Service Board`
    );
  };

  const handleUpdateMenuItem = (id: string, updated: Partial<MenuItem>) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
    triggerToast('Updated menu item');
  };

  const handleDeleteMenuItem = (id: string) => {
    const target = menuItems.find((m) => m.id === id);
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    triggerToast(`Deleted ${target?.name || 'menu item'}`);
  };

  const handleToggleAvailability = (id: string, manualOverride?: boolean) => {
    setMenuItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (manualOverride !== undefined) {
            const evalWithoutOverride = evaluateDishStock(
              { ...item, manualOverrideAvailable: false },
              ingredients
            );
            const nextAvail = manualOverride
              ? true
              : evalWithoutOverride.isRecipeSufficient;
            triggerToast(
              manualOverride
                ? `${item.name} manually overridden to Available`
                : `${item.name} returned to automatic stock control`
            );
            return {
              ...item,
              manualOverrideAvailable: manualOverride,
              isAvailable: nextAvail,
            };
          }

          const stockEval = evaluateDishStock(item, ingredients);
          const currentlyAvail = stockEval.isEffectivelyAvailable;
          const nextState = !currentlyAvail;
          const nextOverride =
            nextState && !stockEval.isRecipeSufficient
              ? true
              : !nextState
              ? false
              : item.manualOverrideAvailable;

          triggerToast(
            `${item.name} marked as ${
              nextState ? 'In Stock (Available)' : "86'd (Sold Out)"
            }`
          );
          return {
            ...item,
            isAvailable: nextState,
            manualOverrideAvailable: nextOverride,
          };
        }
        return item;
      })
    );
  };

  // Raw Ingredients & Recipe Mapping (BOM) Handlers
  const handleAddIngredient = (
    ingData: Omit<Ingredient, 'id' | 'restaurantId' | 'updatedAt'>
  ) => {
    const newIng: Ingredient = {
      ...ingData,
      id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      restaurantId: activeRestaurant.id,
      updatedAt: new Date().toISOString(),
    };
    setIngredients((prev) => [newIng, ...prev]);

    const mov: InventoryMovement = {
      id: `mov-${Date.now()}`,
      restaurantId: activeRestaurant.id,
      ingredientId: newIng.id,
      ingredientName: newIng.name,
      type: 'restock',
      quantity: newIng.currentStock,
      unit: newIng.unit,
      balanceAfter: newIng.currentStock,
      reason: 'Opening raw material stock entry',
      timestamp: new Date().toISOString(),
      staffName: activeWaiterName,
    };
    setInventoryMovements((prev) => [mov, ...prev]);
    triggerToast(`Added raw ingredient "${newIng.name}" (${newIng.currentStock} ${newIng.unit})`);
  };

  const handleRestockIngredient = (
    ingredientId: string,
    addedQty: number,
    reason: string
  ) => {
    const target = ingredients.find((i) => i.id === ingredientId);
    if (!target || addedQty <= 0) return;

    const newBalance = Math.round((target.currentStock + addedQty) * 100) / 100;
    const nextIngredients = ingredients.map((i) =>
      i.id === ingredientId
        ? { ...i, currentStock: newBalance, updatedAt: new Date().toISOString() }
        : i
    );
    setIngredients(nextIngredients);

    const mov: InventoryMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      restaurantId: activeRestaurant.id,
      ingredientId: target.id,
      ingredientName: target.name,
      type: 'restock',
      quantity: addedQty,
      unit: target.unit,
      balanceAfter: newBalance,
      reason,
      timestamp: new Date().toISOString(),
      staffName: activeWaiterName,
    };
    setInventoryMovements((prev) => [mov, ...prev]);

    // Restore availability for any recipe-mapped dishes that now have sufficient stock
    setMenuItems((prev) =>
      prev.map((dish) => {
        const usesIng = (dish.recipe || []).some(
          (r) => r.ingredientId === ingredientId
        );
        if (!usesIng) return dish;
        const ev = evaluateDishStock(dish, nextIngredients);
        if (ev.isRecipeSufficient && !dish.isAvailable) {
          return { ...dish, isAvailable: true };
        }
        return dish;
      })
    );

    triggerToast(
      `Restocked +${addedQty} ${target.unit} of ${target.name} (New stock: ${newBalance} ${target.unit})`
    );
  };

  const handleLogWastage = (
    ingredientId: string,
    wastageQty: number,
    reason: string
  ) => {
    const target = ingredients.find((i) => i.id === ingredientId);
    if (!target || wastageQty <= 0) return;

    const actualDeducted = Math.min(target.currentStock, wastageQty);
    const newBalance = Math.max(
      0,
      Math.round((target.currentStock - wastageQty) * 100) / 100
    );
    const nextIngredients = ingredients.map((i) =>
      i.id === ingredientId
        ? { ...i, currentStock: newBalance, updatedAt: new Date().toISOString() }
        : i
    );
    setIngredients(nextIngredients);

    const mov: InventoryMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      restaurantId: activeRestaurant.id,
      ingredientId: target.id,
      ingredientName: target.name,
      type: 'wastage',
      quantity: -actualDeducted,
      unit: target.unit,
      balanceAfter: newBalance,
      reason,
      timestamp: new Date().toISOString(),
      staffName: activeWaiterName,
    };
    setInventoryMovements((prev) => [mov, ...prev]);

    // Sync menu items for automatic 86 if stock dropped below recipe threshold
    const syncedMenu = syncMenuAvailabilityWithInventory(
      menuItems,
      nextIngredients
    );
    const newly86d = syncedMenu.filter(
      (m, idx) => !m.isAvailable && menuItems[idx]?.isAvailable
    );
    setMenuItems(syncedMenu);

    if (newly86d.length > 0) {
      triggerToast(
        `Wastage logged · Auto-86'd Sold Out: ${newly86d
          .map((d) => d.name)
          .join(', ')}`
      );
    } else {
      triggerToast(
        `Logged wastage of ${actualDeducted} ${target.unit} ${target.name}`
      );
    }
  };

  const handleSetIngredientStock = (
    ingredientId: string,
    newStock: number,
    reason: string
  ) => {
    const target = ingredients.find((i) => i.id === ingredientId);
    if (!target) return;

    const clamped = Math.max(0, Math.round(newStock * 100) / 100);
    const delta = Math.round((clamped - target.currentStock) * 100) / 100;
    const nextIngredients = ingredients.map((i) =>
      i.id === ingredientId
        ? { ...i, currentStock: clamped, updatedAt: new Date().toISOString() }
        : i
    );
    setIngredients(nextIngredients);

    const mov: InventoryMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      restaurantId: activeRestaurant.id,
      ingredientId: target.id,
      ingredientName: target.name,
      type: delta < 0 ? 'wastage' : 'manual_adjustment',
      quantity: delta,
      unit: target.unit,
      balanceAfter: clamped,
      reason,
      timestamp: new Date().toISOString(),
      staffName: activeWaiterName,
    };
    setInventoryMovements((prev) => [mov, ...prev]);

    const syncedMenu = syncMenuAvailabilityWithInventory(
      menuItems,
      nextIngredients
    );
    const newly86d = syncedMenu.filter(
      (m, idx) => !m.isAvailable && menuItems[idx]?.isAvailable
    );
    setMenuItems(syncedMenu);

    if (newly86d.length > 0) {
      triggerToast(
        `Stock depleted · Auto-86'd Sold Out: ${newly86d
          .map((d) => d.name)
          .join(', ')}`
      );
    } else {
      triggerToast(`Updated ${target.name} stock to ${clamped} ${target.unit}`);
    }
  };

  const handleDeleteIngredient = (ingredientId: string) => {
    const target = ingredients.find((i) => i.id === ingredientId);
    setIngredients((prev) => prev.filter((i) => i.id !== ingredientId));
    setMenuItems((prev) =>
      prev.map((m) => ({
        ...m,
        recipe: (m.recipe || []).filter((r) => r.ingredientId !== ingredientId),
      }))
    );
    if (target) {
      triggerToast(`Removed raw ingredient "${target.name}"`);
    }
  };

  const handleUpdateDishRecipe = (
    menuItemId: string,
    recipe: RecipeIngredientItem[]
  ) => {
    setMenuItems((prev) =>
      prev.map((item) => {
        if (item.id !== menuItemId) return item;
        const updatedDish: MenuItem = { ...item, recipe };
        const ev = evaluateDishStock(updatedDish, ingredients);
        return {
          ...updatedDish,
          isAvailable: updatedDish.manualOverrideAvailable
            ? updatedDish.isAvailable
            : ev.isRecipeSufficient,
        };
      })
    );
    triggerToast('Updated dish Bill of Materials (recipe mapping)');
  };

  /**
   * Automatically deducts raw ingredients for any order items that haven't been deducted yet,
   * logs movements, and triggers Auto-86 if any ingredient drops below recipe requirements.
   */
  const deductInventoryForOrder = (
    order: TableOrder,
    triggerLabel: string
  ): { updatedOrder: TableOrder; auto86Names: string[] } => {
    let workingIngredients = [...ingredients];
    const newMovements: InventoryMovement[] = [];
    const nowIso = new Date().toISOString();

    const updatedItems = order.items.map((orderItem) => {
      const alreadyDeducted = orderItem.inventoryDeductedQty || 0;
      const deltaQty = orderItem.quantity - alreadyDeducted;
      if (deltaQty <= 0) return orderItem;

      const dish = menuItems.find((m) => m.id === orderItem.menuItemId);
      if (dish?.recipe && dish.recipe.length > 0) {
        dish.recipe.forEach((req) => {
          const ingIndex = workingIngredients.findIndex(
            (i) => i.id === req.ingredientId
          );
          if (ingIndex >= 0) {
            const ing = workingIngredients[ingIndex];
            const deductInIngUnit =
              Math.round(
                convertUnitQuantity(
                  req.quantity * deltaQty,
                  req.unit,
                  ing.unit
                ) * 100
              ) / 100;
            const newBalance = Math.max(
              0,
              Math.round((ing.currentStock - deductInIngUnit) * 100) / 100
            );
            workingIngredients[ingIndex] = {
              ...ing,
              currentStock: newBalance,
              updatedAt: nowIso,
            };

            newMovements.push({
              id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              restaurantId: order.restaurantId,
              ingredientId: ing.id,
              ingredientName: ing.name,
              type: 'order_deduction',
              quantity: -deductInIngUnit,
              unit: ing.unit,
              balanceAfter: newBalance,
              reason: `${triggerLabel} · Table ${order.tableName} (${deltaQty}x ${dish.name})`,
              timestamp: nowIso,
              staffName: order.waiterName || activeWaiterName,
            });
          }
        });
      }

      return {
        ...orderItem,
        inventoryDeductedQty: orderItem.quantity,
      };
    });

    const auto86Names: string[] = [];
    if (newMovements.length > 0) {
      setIngredients(workingIngredients);
      setInventoryMovements((prev) => [...newMovements, ...prev]);

      const syncedMenu = syncMenuAvailabilityWithInventory(
        menuItems,
        workingIngredients
      );
      syncedMenu.forEach((m, idx) => {
        if (!m.isAvailable && menuItems[idx]?.isAvailable) {
          auto86Names.push(m.name);
        }
      });
      setMenuItems(syncedMenu);
    }

    return {
      updatedOrder: {
        ...order,
        items: updatedItems,
        updatedAt: nowIso,
      },
      auto86Names,
    };
  };

  // Order Drawer & Settlement Handlers
  const handleOpenOrderDrawer = (tableId: string) => {
    const targetTable = tables.find((t) => t.id === tableId);
    if (!targetTable) return;

    // Find active open order or create new
    let activeOrder = tableOrders.find(
      (o) => o.tableId === tableId && o.status !== 'settled'
    );
    if (!activeOrder) {
      const activeRes = reservations.find(
        (r) =>
          r.tableId === tableId &&
          r.date === TODAY_DATE &&
          r.status === 'Seated'
      );
      activeOrder = {
        id: `order-${tableId}-${Date.now()}`,
        restaurantId: activeRestaurant.id,
        tableId,
        tableName: targetTable.name,
        reservationId: activeRes?.id,
        guestId: activeRes?.guestId,
        guestName: activeRes?.guestName || 'Dine-In Guest',
        guestPhone: activeRes?.guestPhone,
        partySize: activeRes?.partySize || targetTable.capacity,
        kotCount: 0,
        kotList: [],
        items: [],
        taxRate: 0.05,
        discountType: 'none',
        discountValue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        grandTotal: 0,
      };
      setTableOrders((prev) => [...prev, activeOrder!]);
    }

    setActiveDrawerTableId(tableId);
  };

  const handleUpdateOrder = (updatedOrder: TableOrder) => {
    setTableOrders((prev) => {
      const exists = prev.some((o) => o.id === updatedOrder.id);
      if (exists) {
        return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      }
      return [updatedOrder, ...prev];
    });
  };

  const handleSendKOT = (newTicket: KitchenTicket, updatedOrder: TableOrder) => {
    setKitchenTickets((prev) => [newTicket, ...prev]);
    const { updatedOrder: orderWithDeductions, auto86Names } =
      deductInventoryForOrder(
        {
          ...updatedOrder,
          status: 'preparing',
          kotList: [...(updatedOrder.kotList || []), newTicket],
        },
        newTicket.kotNumber
      );
    handleUpdateOrder(orderWithDeductions);

    if (auto86Names.length > 0) {
      triggerToast(
        `${newTicket.kotNumber} sent & inventory deducted · Auto-86 Sold Out: ${auto86Names.join(', ')}`
      );
    } else {
      triggerToast(
        `${newTicket.kotNumber} dispatched to Kitchen for Table ${newTicket.tableName} (Stock auto-deducted)`
      );
    }
  };

  const handleUpdateTableStatus = (
    tableId: string,
    status: 'Free' | 'Seated' | 'Bill Requested'
  ) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status } : t))
    );
  };

  const handleUpdateTicketStatus = (ticketId: string, status: KdsTicketStatus) => {
    const targetTicket = kitchenTickets.find((t) => t.id === ticketId);
    const now = new Date().toISOString();

    setKitchenTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          status,
          items:
            status === 'ready' || status === 'completed'
              ? t.items.map((it) => ({ ...it, completed: true }))
              : t.items,
          startedAt: status === 'preparing' ? t.startedAt || now : t.startedAt,
          readyAt: status === 'ready' ? now : t.readyAt,
          completedAt: status === 'completed' ? now : t.completedAt,
        };
      })
    );

    if (targetTicket) {
      const nextOrderStatus =
        status === 'ready'
          ? 'ready'
          : status === 'preparing'
          ? 'preparing'
          : undefined;
      if (nextOrderStatus) {
        setTableOrders((prev) =>
          prev.map((o) =>
            o.id === targetTicket.orderId && o.status !== 'settled'
              ? { ...o, status: nextOrderStatus, updatedAt: now }
              : o
          )
        );
      }
    }

    if (status === 'ready') {
      triggerToast(
        `🔔 Table ${targetTicket?.tableName || ''} Order Ready`
      );
    } else if (status === 'completed') {
      triggerToast('KOT marked as Picked Up & Completed');
    }
  };

  const handleToggleItemCompleted = (ticketId: string, itemId: string) => {
    setKitchenTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        const nextItems = t.items.map((it) =>
          it.id === itemId ? { ...it, completed: !it.completed } : it
        );
        const nextStatus =
          t.status === 'pending' ? 'preparing' : t.status;
        return {
          ...t,
          status: nextStatus,
          startedAt: t.startedAt || new Date().toISOString(),
          items: nextItems,
        };
      })
    );
  };

  const handleSendToKitchen = (orderId: string) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const targetOrder = tableOrders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const unsentItems = targetOrder.items.filter((it) => !it.sentToKitchen);
    const newKotCount = (targetOrder.kotCount || 0) + 1;
    const kotNumber = `KOT #${100 + newKotCount}`;

    let createdTicket: KitchenTicket | null = null;
    if (unsentItems.length > 0) {
      createdTicket = {
        id: `kot-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        kotNumber,
        restaurantId: targetOrder.restaurantId,
        orderId: targetOrder.id,
        tableId: targetOrder.tableId,
        tableName: targetOrder.tableName,
        waiterName: targetOrder.waiterName || activeWaiterName || 'Host Stand',
        guestName: targetOrder.guestName || `Table ${targetOrder.tableName}`,
        partySize: targetOrder.partySize || 2,
        status: 'pending',
        createdAt: new Date().toISOString(),
        items: unsentItems.map((it) => {
          const mItem = menuItems.find((m) => m.id === it.menuItemId);
          return {
            id: `ki-${Date.now()}-${it.id}`,
            orderItemId: it.id,
            name: it.name,
            quantity: it.quantity,
            notes: it.notes,
            dietary: mItem?.dietary,
            completed: false,
          };
        }),
      };
      setKitchenTickets((prev) => [createdTicket!, ...prev]);
    }

    const preparedOrder: TableOrder = {
      ...targetOrder,
      status: 'preparing',
      kotCount: newKotCount,
      kotList: createdTicket
        ? [...(targetOrder.kotList || []), createdTicket]
        : targetOrder.kotList,
      items: targetOrder.items.map((it) =>
        it.sentToKitchen ? it : { ...it, sentToKitchen: true, sentAt: timeStr }
      ),
      updatedAt: new Date().toISOString(),
    };

    const { updatedOrder: orderWithDeductions, auto86Names } =
      deductInventoryForOrder(preparedOrder, kotNumber);

    setTableOrders((prev) =>
      prev.map((o) => (o.id === orderId ? orderWithDeductions : o))
    );

    if (auto86Names.length > 0) {
      triggerToast(
        `Sent ${kotNumber} (${unsentItems.length} items) · Auto-86 Sold Out: ${auto86Names.join(', ')}`
      );
    } else {
      triggerToast(`Sent ${kotNumber} to Kitchen (${unsentItems.length} items at ${timeStr})`);
    }
  };

  const handleOpenSettleBill = (tableId: string) => {
    setActiveDrawerTableId(null);
    // Transition table status to 'Bill Requested' ('billing') when opening settlement check
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId && t.status !== 'Free'
          ? { ...t, status: 'Bill Requested' }
          : t
      )
    );
    setActiveSettlementTableId(tableId);
  };

  const handleOpenThermalPrint = (orderId: string, mode: 'bill' | 'kot') => {
    setThermalPrintState({ orderId, mode });
  };

  const handleConfirmSettlement = (settlementData: {
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
    cgstAmount?: number;
    sgstAmount?: number;
    taxAmount: number;
    serviceChargeAmount?: number;
    grandTotal: number;
    splitBreakdown?: {
      cash?: number;
      upi?: number;
      card?: number;
    };
    receiptCode: string;
  }) => {
    const targetTable = tables.find((t) => t.id === settlementData.tableId);
    const targetRes = reservations.find(
      (r) =>
        r.id === settlementData.reservationId ||
        (r.tableId === settlementData.tableId && r.status === 'Seated')
    );

    // Deduct any remaining un-deducted items on bill settlement
    const existingOrder = tableOrders.find((o) => o.id === settlementData.orderId);
    const deductedOrder = existingOrder
      ? deductInventoryForOrder(existingOrder, `Bill ${settlementData.receiptCode}`)
          .updatedOrder
      : undefined;

    const settledIso = new Date().toISOString();
    const cgst =
      settlementData.cgstAmount ??
      Math.round((settlementData.taxAmount / 2) * 100) / 100;
    const sgst =
      settlementData.sgstAmount ??
      Math.round((settlementData.taxAmount / 2) * 100) / 100;

    // 1. Mark order as settled (persists to settledChecks and Daily Z-Report)
    setTableOrders((prev) =>
      prev.map((o) =>
        o.id === settlementData.orderId
          ? {
              ...(deductedOrder || o),
              status: 'settled',
              settledAt: settledIso,
              updatedAt: settledIso,
              paymentMethod: settlementData.paymentMethod,
              subtotal: settlementData.subtotal,
              discountAmount: settlementData.discountAmount,
              discountType: settlementData.discountType,
              discountValue: settlementData.discountValue,
              taxRate: settlementData.taxRate,
              cgstAmount: cgst,
              sgstAmount: sgst,
              taxAmount: settlementData.taxAmount,
              serviceChargeAmount: settlementData.serviceChargeAmount ?? 0,
              grandTotal: settlementData.grandTotal,
              splitBreakdown: settlementData.splitBreakdown,
              receiptCode: settlementData.receiptCode,
            }
          : o
      )
    );

    // 2. Complete any open KDS tickets for this order/table
    setKitchenTickets((prev) =>
      prev.map((t) =>
        (t.orderId === settlementData.orderId ||
          t.tableId === settlementData.tableId) &&
        t.status !== 'completed'
          ? { ...t, status: 'completed', completedAt: settledIso }
          : t
      )
    );

    // 3. Reset the table back to 'Free' / available on Floor & Waiter Pad
    setTables((prev) =>
      prev.map((t) =>
        t.id === settlementData.tableId
          ? { ...t, status: 'Free', currentReservationId: undefined }
          : t
      )
    );

    // 4. Complete the reservation if one exists
    if (targetRes) {
      setReservations((prev) =>
        prev.map((r) =>
          r.id === targetRes.id
            ? {
                ...r,
                status: 'Completed',
                completedAt: new Date().toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                }),
                estimatedSpend: settlementData.grandTotal,
              }
            : r
        )
      );
    }

    // 5. Update Guest CRM: increment totalVisits and add bill amount to lifetimeSpend
    const targetGuestId =
      settlementData.guestId || targetRes?.guestId || existingOrder?.guestId;
    const targetGuestName =
      targetRes?.guestName || existingOrder?.guestName || 'Walk-in Guest';
    const targetGuestPhone =
      targetRes?.guestPhone || existingOrder?.guestPhone || '';
    const partyCovers =
      targetRes?.partySize || existingOrder?.partySize || targetTable?.capacity || 2;

    setGuests((prev) => {
      const matchedIndex = prev.findIndex(
        (g) =>
          (targetGuestId && g.id === targetGuestId) ||
          (targetGuestName &&
            targetGuestName !== 'Walk-in Guest' &&
            g.name.toLowerCase() === targetGuestName.toLowerCase()) ||
          (targetGuestPhone &&
            normalizePhoneDigits(g.phone).length >= 7 &&
            normalizePhoneDigits(g.phone) ===
              normalizePhoneDigits(targetGuestPhone))
      );

      const visitEntry = {
        id: `vh-${Date.now()}`,
        date: TODAY_DATE,
        time: new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        }),
        shift: currentServiceShift,
        tableName: targetTable?.name || 'T1',
        partySize: partyCovers,
        status: 'Completed' as const,
        spend: settlementData.grandTotal,
        notes: `Settled via ${settlementData.paymentMethod} (${settlementData.receiptCode})`,
      };

      if (matchedIndex >= 0) {
        return prev.map((g, idx) =>
          idx === matchedIndex
            ? {
                ...g,
                totalVisits: g.totalVisits + 1,
                lastVisited: TODAY_DATE,
                lifetimeSpend:
                  Math.round((g.lifetimeSpend + settlementData.grandTotal) * 100) /
                  100,
                history: [visitEntry, ...g.history],
              }
            : g
        );
      }

      // If no existing guest record matched, create a CRM Guest record so visits & spend are tracked
      const newCrmGuest: GuestProfile = {
        id: targetGuestId || `gst-${Date.now()}`,
        restaurantId: activeRestaurant.id,
        name:
          targetGuestName !== 'Walk-in Guest'
            ? targetGuestName
            : `Table ${targetTable?.name || 'T1'} Guest`,
        phone: targetGuestPhone || '+91 98201 00000',
        totalVisits: 1,
        lastVisited: TODAY_DATE,
        lifetimeSpend: settlementData.grandTotal,
        averagePartySize: partyCovers,
        tags: ['New Guest'],
        dietaryRestrictions: 'None',
        allergyWarnings: 'No known allergies',
        personalNotes: `Created automatically on bill settlement (${settlementData.receiptCode}).`,
        preferredZone: targetTable?.zone || 'Main Hall',
        history: [visitEntry],
      };
      return [newCrmGuest, ...prev];
    });

    triggerToast(
      `Settled ${formatCurrency(settlementData.grandTotal)} for Table ${
        targetTable?.name || ''
      } via ${settlementData.paymentMethod} · CRM & Z-Report updated · Table is now Free`
    );
  };

  // Automated Post-Dining Feedback Handlers
  const handleAddFeedback = (feedbackData: Omit<GuestFeedback, 'id'>) => {
    const newFeedback: GuestFeedback = {
      ...feedbackData,
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setFeedbacks((prev) => [newFeedback, ...prev]);

    if (newFeedback.rating <= 3) {
      setGuests((prev) =>
        prev.map((g) =>
          g.id === newFeedback.guestId ? { ...g, needsManagerFollowUp: true } : g
        )
      );
      triggerToast(`Logged ${newFeedback.rating}★ feedback · Flagged guest for Manager Follow-up`);
    } else {
      triggerToast(`Logged ${newFeedback.rating}★ feedback · Qualified for Google Maps review invite`);
    }
  };

  const handleResolveFeedback = (feedbackId: string, resolutionNote: string) => {
    const target = feedbacks.find((f) => f.id === feedbackId);
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === feedbackId
          ? { ...f, status: 'resolved', managerFollowUpNote: resolutionNote }
          : f
      )
    );
    if (target) {
      setGuests((prev) =>
        prev.map((g) =>
          g.id === target.guestId ? { ...g, needsManagerFollowUp: false } : g
        )
      );
    }
    triggerToast('Resolved manager follow-up & updated guest CRM dossier');
  };

  const handleResetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRestaurants(INITIAL_RESTAURANTS);
    setActiveRestaurantId(INITIAL_RESTAURANTS[0].id);
    setTables(INITIAL_TABLES);
    setGuests(INITIAL_GUESTS);
    setReservations(INITIAL_RESERVATIONS);
    setMenuItems(INITIAL_MENU_ITEMS);
    setIngredients(INITIAL_INGREDIENTS);
    setInventoryMovements(INITIAL_INVENTORY_MOVEMENTS);
    setTableOrders(INITIAL_ORDERS);
    setFeedbacks(INITIAL_FEEDBACKS);
    setKitchenTickets(INITIAL_KITCHEN_TICKETS);
    triggerToast('Restored default MAISON hospitality seed data, menu, inventory & KDS tickets');
  };

  // Kitchen Ticket & Inventory metrics for active restaurant
  const restaurantKitchenTickets = kitchenTickets.filter(
    (t) => t.restaurantId === activeRestaurant.id
  );
  const readyTicketsCount = restaurantKitchenTickets.filter(
    (t) => t.status === 'ready'
  ).length;
  const activeKitchenCount = restaurantKitchenTickets.filter(
    (t) => t.status !== 'completed'
  ).length;
  const lowOrDepletedIngCount = restaurantIngredients.filter(
    (i) => i.currentStock <= i.minThreshold
  ).length;

  // Find active entity for drawer & settlement modals
  const activeDrawerTable = tables.find((t) => t.id === activeDrawerTableId);
  const activeDrawerReservation = reservations.find(
    (r) =>
      (activeDrawerTable && r.id === activeDrawerTable.currentReservationId) ||
      (activeDrawerTable &&
        r.tableId === activeDrawerTable.id &&
        r.date === TODAY_DATE &&
        r.status === 'Seated')
  );
  const activeDrawerOrder = tableOrders.find(
    (o) => o.tableId === activeDrawerTableId && o.status !== 'settled'
  );

  const activeSettlementTable = tables.find((t) => t.id === activeSettlementTableId);
  const activeSettlementReservation = reservations.find(
    (r) =>
      (activeSettlementTable && r.id === activeSettlementTable.currentReservationId) ||
      (activeSettlementTable &&
        r.tableId === activeSettlementTable.id &&
        r.date === TODAY_DATE &&
        r.status === 'Seated')
  );
  const activeSettlementOrder = tableOrders.find(
    (o) => o.tableId === activeSettlementTableId && o.status !== 'settled'
  );
  const activeSettlementGuest = guests.find(
    (g) =>
      (activeSettlementOrder?.guestId && g.id === activeSettlementOrder.guestId) ||
      (activeSettlementReservation && g.id === activeSettlementReservation.guestId) ||
      (activeSettlementReservation &&
        g.name.toLowerCase() === activeSettlementReservation.guestName.toLowerCase()) ||
      (activeSettlementOrder?.guestName &&
        g.name.toLowerCase() === activeSettlementOrder.guestName.toLowerCase())
  );

  // Find active entity for Thermal Receipt / KOT Print Modal
  const thermalPrintOrder = thermalPrintState
    ? tableOrders.find((o) => o.id === thermalPrintState.orderId)
    : undefined;
  const thermalPrintTable = thermalPrintOrder
    ? tables.find((t) => t.id === thermalPrintOrder.tableId)
    : undefined;
  const thermalPrintReservation = thermalPrintOrder
    ? reservations.find(
        (r) =>
          r.id === thermalPrintOrder.reservationId ||
          (r.tableId === thermalPrintOrder.tableId &&
            r.date === TODAY_DATE &&
            r.status === 'Seated')
      )
    : undefined;
  const thermalPrintGuest = thermalPrintReservation
    ? guests.find(
        (g) =>
          g.id === thermalPrintReservation.guestId ||
          g.name.toLowerCase() === thermalPrintReservation.guestName.toLowerCase()
      )
    : undefined;

  const handleVerifyUpiAndSettle = (orderToSettle: TableOrder) => {
    const subtotal = orderToSettle.items.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );
    const discountAmount = orderToSettle.discountAmount || 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    const serviceChargeRate = activeRestaurant.serviceChargeEnabled
      ? activeRestaurant.serviceChargeRate || 0.05
      : 0;
    const serviceChargeAmount =
      orderToSettle.serviceChargeAmount !== undefined
        ? orderToSettle.serviceChargeAmount
        : Math.round(taxable * serviceChargeRate * 100) / 100;
    const taxRate = orderToSettle.taxRate || activeRestaurant.taxRate || 0.05;
    const gstBase = taxable + serviceChargeAmount;
    const cgst = Math.round(gstBase * (taxRate / 2) * 100) / 100;
    const sgst = Math.round(gstBase * (taxRate / 2) * 100) / 100;
    const taxAmount = cgst + sgst;
    const grandTotal = Math.round((gstBase + taxAmount) * 100) / 100;
    const receiptCode =
      orderToSettle.receiptCode ||
      `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    handleConfirmSettlement({
      orderId: orderToSettle.id,
      tableId: orderToSettle.tableId,
      reservationId: thermalPrintReservation?.id || orderToSettle.reservationId,
      guestId:
        orderToSettle.guestId ||
        thermalPrintGuest?.id ||
        thermalPrintReservation?.guestId,
      paymentMethod: 'UPI (GPay/PhonePe/Paytm)',
      subtotal,
      discountAmount,
      discountType: orderToSettle.discountType || 'none',
      discountValue: orderToSettle.discountValue || 0,
      taxRate,
      cgstAmount: cgst,
      sgstAmount: sgst,
      taxAmount,
      serviceChargeAmount,
      grandTotal,
      receiptCode,
    });
    setThermalPrintState(null);
    setActiveSettlementTableId(null);
    setActiveDrawerTableId(null);
  };

  // Host Stand / Manager operational mode check (shows Tier 2 Manager Sub-Navigation)
  const isHostStandMode = !['waiter', 'kitchen', 'portal'].includes(activeTab);

  const handleDismissSetupBanner = () => {
    setShowSetupBanner(false);
    try {
      localStorage.setItem('maison_setup_banner_dismissed_v1', 'true');
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900">
      {/* =================================================================== */}
      {/* TIER 1: TOP PRIMARY HEADER (BRAND + OUTLET + VIEW SWITCHER + +NEW)  */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 py-2.5 shadow-xs">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3">
          {/* LEFT: MAISON Brand Logo + Restaurant/Outlet Selector + Shift Badge */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <a
              href="#service"
              onClick={(e) => {
                e.preventDefault();
                navigateToTab('service');
                setServiceView('today');
              }}
              className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 font-serif-display whitespace-nowrap shrink-0 hover:opacity-85 transition-opacity"
            >
              MAISON
            </a>

            {/* Restaurant / Outlet Selector Dropdown */}
            <div className="flex items-center gap-1.5 pl-2.5 sm:pl-3.5 border-l border-stone-200">
              <Building2 className="w-3.5 h-3.5 text-[#C5A059] shrink-0 hidden sm:block" />
              <select
                aria-label="Select restaurant outlet"
                value={activeRestaurant.id}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    handleCreateNewRestaurant();
                  } else {
                    setActiveRestaurantId(e.target.value);
                  }
                }}
                className="text-xs font-semibold text-stone-900 bg-stone-100/80 hover:bg-stone-100 px-2.5 py-1.5 rounded-lg border border-stone-200/80 focus:outline-none focus:border-stone-400 cursor-pointer truncate max-w-[135px] sm:max-w-[180px]"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
                <option value="__new__">+ New Outlet...</option>
              </select>
            </div>

            {/* Current Shift Badge (Lunch / Dinner Toggle) */}
            <div className="hidden sm:inline-flex items-center p-0.5 bg-stone-100 rounded-lg border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCurrentServiceShift('Lunch');
                  setShiftFilter('Lunch');
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  currentServiceShift === 'Lunch'
                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Lunch
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentServiceShift('Dinner');
                  setShiftFilter('Dinner');
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  currentServiceShift === 'Dinner'
                    ? 'bg-stone-900 text-white font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Dinner
              </button>
            </div>

            {/* Compact Shift Toggle on small mobile */}
            <button
              type="button"
              onClick={() => {
                const next = currentServiceShift === 'Lunch' ? 'Dinner' : 'Lunch';
                setCurrentServiceShift(next);
                setShiftFilter(next);
              }}
              className="sm:hidden px-2 py-1 text-[11px] font-semibold bg-stone-100 text-stone-800 rounded-lg border border-stone-200"
              title="Toggle Active Shift"
            >
              {currentServiceShift}
            </button>
          </div>

          {/* CENTER: Operational View Switcher (Desktop & Large Tablet) */}
          <div
            role="tablist"
            aria-label="Operational View Switcher"
            className="hidden lg:flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 shadow-xs"
          >
            {/* 1. Host Stand / Floor */}
            <button
              type="button"
              onClick={() => {
                navigateToTab('service');
                setServiceView('today');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition-all flex items-center gap-2 cursor-pointer ${
                isHostStandMode
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <span aria-hidden="true">🛎️</span>
              <span>Host Stand / Floor</span>
              {readyTicketsCount > 0 && (
                <span
                  title={`${readyTicketsCount} KOT Ready for Pickup`}
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-stone-950 flex items-center gap-0.5 animate-pulse"
                >
                  <Bell className="w-2.5 h-2.5" />
                  {readyTicketsCount}
                </span>
              )}
            </button>

            {/* 2. Waiter Order Pad */}
            <button
              type="button"
              onClick={() => navigateToTab('waiter')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'waiter'
                  ? 'bg-[#C5A059] text-stone-950 shadow-xs font-bold'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <span aria-hidden="true">📱</span>
              <span>Waiter Order Pad</span>
              {readyTicketsCount > 0 && (
                <span
                  title={`${readyTicketsCount} KOT Ready for Pickup`}
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-stone-950 flex items-center gap-0.5 animate-pulse"
                >
                  <Bell className="w-2.5 h-2.5" />
                  {readyTicketsCount}
                </span>
              )}
            </button>

            {/* 3. Kitchen Display (KDS) */}
            <button
              type="button"
              onClick={() => navigateToTab('kitchen')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'kitchen'
                  ? 'bg-emerald-500 text-stone-950 shadow-xs font-bold'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <span aria-hidden="true">🍳</span>
              <span>Kitchen Display (KDS)</span>
              {activeKitchenCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 text-amber-400 border border-amber-500/40 font-mono">
                  {activeKitchenCount}
                </span>
              )}
            </button>
          </div>

          {/* RIGHT: Single "+ New" Dropdown + Global Settings Icon + User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Single High-Contrast "+ New" Button with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsQuickMenuOpen(!isQuickMenuOpen);
                  setIsProfileMenuOpen(false);
                }}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl min-h-[40px] flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#C5A059]" />
                <span>+ New</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {isQuickMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 animate-in fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      setEditingReservation(null);
                      setModalInitialGuest(null);
                      setModalInitialTableId(undefined);
                      setIsBookModalOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-medium text-stone-800 hover:bg-stone-50 flex items-center gap-2.5 min-h-[44px] cursor-pointer"
                  >
                    <CalendarPlus className="w-4 h-4 text-stone-700" />
                    <div>
                      <div className="font-semibold text-stone-900">New Reservation</div>
                      <div className="text-[10px] text-stone-500">Advance table booking</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      setModalInitialTableId(undefined);
                      setIsWalkInModalOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-medium text-stone-800 hover:bg-stone-50 flex items-center gap-2.5 min-h-[44px] cursor-pointer"
                  >
                    <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-stone-900">Quick Walk-in</div>
                      <div className="text-[10px] text-stone-500">Seat guest immediately</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      setIsAddGuestModalOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-medium text-stone-800 hover:bg-stone-50 flex items-center gap-2.5 min-h-[44px] cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-semibold text-stone-900">Add Guest</div>
                      <div className="text-[10px] text-stone-500">Create VIP / CRM profile</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Global Settings Icon */}
            <button
              type="button"
              onClick={() => navigateToTab('settings')}
              title="Global Restaurant Settings"
              aria-label="Global Restaurant Settings"
              className={`p-2 rounded-xl border transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-stone-900 text-[#C5A059] border-stone-900'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile Pill / Avatar Menu on Far Right */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                  setIsQuickMenuOpen(false);
                }}
                title="Staff Profile & Tools"
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors min-h-[40px] cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-stone-900 text-[#C5A059] text-[11px] font-bold flex items-center justify-center shrink-0">
                  {activeWaiterName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <span className="hidden xl:inline text-xs font-semibold text-stone-800 max-w-[100px] truncate">
                  {activeWaiterName.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in">
                  <div className="px-4 py-2 border-b border-stone-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Active Floor Profile
                    </div>
                    <div className="text-xs font-bold text-stone-900 mt-0.5">
                      {activeWaiterName}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {activeRestaurant.name} ({activeRestaurant.city})
                    </div>
                  </div>

                  <div className="px-3 py-1.5">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-1 mb-1">
                      Switch Staff Member
                    </label>
                    <select
                      value={activeWaiterName}
                      onChange={(e) => {
                        setActiveWaiterName(e.target.value);
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-stone-800 focus:outline-none"
                    >
                      {(activeRestaurant.staffAccounts || INITIAL_STAFF_ACCOUNTS).map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-stone-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigateToTab(activeTab === 'portal' ? 'service' : 'portal');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                    <span>
                      {activeTab === 'portal' ? 'Exit Guest Portal' : 'Public Guest Booking (/book)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigateToTab('marketing');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-stone-500" />
                    <span>Campaigns &amp; Guest Reviews</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setOnboardingStep(1);
                      navigateToTab('onboarding');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    <span>Venue Setup Wizard</span>
                  </button>

                  <div className="border-t border-stone-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleResetDemoData();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Demo Data</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* TIER 2: MANAGER SUB-NAVIGATION BAR (ACTIVE WHEN ON "HOST STAND")    */}
      {/* =================================================================== */}
      {isHostStandMode && (
        <div className="bg-white border-b border-stone-200 px-4 sm:px-6 shadow-2xs">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
            <nav
              aria-label="Manager Sub-Navigation"
              className="flex items-center gap-1 sm:gap-2 min-w-max"
            >
              {/* 1. Live Floor & Service */}
              <button
                type="button"
                onClick={() => navigateToTab('service')}
                className={`relative px-3.5 py-3 text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'service'
                    ? 'text-stone-900 font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Live Floor &amp; Service</span>
                {activeTab === 'service' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-[#C5A059] rounded-t-full" />
                )}
              </button>

              {/* 2. Guests CRM */}
              <button
                type="button"
                onClick={() => navigateToTab('guests')}
                className={`relative px-3.5 py-3 text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'guests'
                    ? 'text-stone-900 font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Guests CRM</span>
                {activeTab === 'guests' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-[#C5A059] rounded-t-full" />
                )}
              </button>

              {/* 3. Menu & Catalog */}
              <button
                type="button"
                onClick={() => navigateToTab('menu')}
                className={`relative px-3.5 py-3 text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'menu'
                    ? 'text-stone-900 font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Menu &amp; Catalog</span>
                {activeTab === 'menu' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-[#C5A059] rounded-t-full" />
                )}
              </button>

              {/* 4. Inventory */}
              <button
                type="button"
                onClick={() => navigateToTab('inventory')}
                className={`relative px-3.5 py-3 text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'text-stone-900 font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Inventory</span>
                {lowOrDepletedIngCount > 0 && (
                  <span
                    title={`${lowOrDepletedIngCount} ingredients low or out of stock`}
                    className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950 font-mono-tabular"
                  >
                    {lowOrDepletedIngCount}
                  </span>
                )}
                {activeTab === 'inventory' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-[#C5A059] rounded-t-full" />
                )}
              </button>

              {/* 5. Daily Z-Reports */}
              <button
                type="button"
                onClick={() => navigateToTab('reports')}
                className={`relative px-3.5 py-3 text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'reports'
                    ? 'text-stone-900 font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Daily Z-Reports</span>
                {activeTab === 'reports' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-[#C5A059] rounded-t-full" />
                )}
              </button>

              {/* 6. Settings */}
              <button
                type="button"
                onClick={() => navigateToTab('settings')}
                className={`relative px-3.5 py-3 text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'settings'
                    ? 'text-stone-900 font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
                {activeTab === 'settings' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-[#C5A059] rounded-t-full" />
                )}
              </button>
            </nav>

            {/* Right-side secondary link for Marketing & Guest Portal */}
            <div className="hidden xl:flex items-center gap-3 text-xs text-stone-500 shrink-0">
              <button
                type="button"
                onClick={() => navigateToTab('marketing')}
                className={`hover:text-stone-900 transition-colors flex items-center gap-1.5 cursor-pointer py-1 ${
                  activeTab === 'marketing' ? 'text-stone-900 font-bold underline decoration-[#C5A059] underline-offset-8' : ''
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Retention &amp; Reviews</span>
                {feedbacks.some((f) => f.status === 'action_required' || f.rating <= 3) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanently Dismissible Setup Banner (Only shows for brand-new unconfigured outlets until dismissed) */}
      {showSetupBanner &&
        !activeRestaurant.onboardingCompleted &&
        activeTab !== 'onboarding' &&
        activeTab !== 'portal' &&
        activeTab !== 'waiter' &&
        activeTab !== 'kitchen' && (
          <div className="bg-[#F4F1EA] border-b border-stone-200 px-4 sm:px-6 py-2">
            <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-stone-700">
                <span className="font-semibold text-stone-900">Setup Guide:</span>
                <span>{activeRestaurant.name}</span>
                <span aria-hidden="true" className="text-stone-400">·</span>
                <span className="text-stone-600">{restaurantTables.length} Tables Configured</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOnboardingStep(1);
                    navigateToTab('onboarding');
                  }}
                  className="px-2.5 py-1 bg-stone-900 text-white rounded-md text-[11px] font-medium hover:bg-stone-800 transition-colors whitespace-nowrap"
                >
                  Finish Setup
                </button>
                <button
                  type="button"
                  onClick={handleDismissSetupBanner}
                  className="text-stone-500 hover:text-stone-900 text-[11px]"
                >
                  Dismiss Permanently
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-lg border border-stone-700 flex items-center gap-2.5 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* TIER 3: MAIN WORKSPACE CONTENT                                      */}
      {/* =================================================================== */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 pb-24 lg:pb-8">
        {activeTab === 'onboarding' && (
          <OnboardingView
            restaurant={activeRestaurant}
            tables={restaurantTables}
            initialStep={onboardingStep}
            onUpdateRestaurant={handleUpdateRestaurant}
            onAddTable={handleAddTable}
            onDeleteTable={handleDeleteTable}
            onOpenTestBookingPage={() => navigateToTab('portal')}
            onClose={() => navigateToTab('service')}
          />
        )}

        {activeTab === 'service' && (
          <ServiceBoard
            reservations={restaurantReservations}
            tables={restaurantTables}
            orders={restaurantOrders}
            kitchenTickets={restaurantKitchenTickets}
            onNavigateToKitchen={() => navigateToTab('kitchen')}
            onNavigateToWaiterPad={() => navigateToTab('waiter')}
            view={serviceView}
            onViewChange={setServiceView}
            shiftFilter={shiftFilter}
            onShiftFilterChange={setShiftFilter}
            onSeatGuest={handleSeatGuest}
            onCompleteDining={handleCompleteDining}
            onMarkNoShow={handleMarkNoShow}
            onCancelReservation={handleCancelReservation}
            onRestoreReservation={handleRestoreReservation}
            onEditReservation={(res) => {
              setEditingReservation(res);
              setIsBookModalOpen(true);
            }}
            onSelectGuestById={handleSelectGuestFromServiceBoard}
            onQuickSeatTable={(tableId) => {
              setModalInitialTableId(tableId);
              setIsWalkInModalOpen(true);
            }}
            onBookSpecificTable={(tableId) => {
              setEditingReservation(null);
              setModalInitialGuest(null);
              setModalInitialTableId(tableId);
              setIsBookModalOpen(true);
            }}
            onCompleteDiningByTable={handleCompleteDiningByTable}
            onOpenOrderDrawer={handleOpenOrderDrawer}
            onOpenSettleBillModal={handleOpenSettleBill}
            onOpenNewBooking={() => {
              setEditingReservation(null);
              setModalInitialGuest(null);
              setModalInitialTableId(undefined);
              setIsBookModalOpen(true);
            }}
          />
        )}

        {activeTab === 'waiter' && (
          <WaiterOrderPad
            restaurantId={activeRestaurant.id}
            restaurantName={activeRestaurant.name}
            tables={restaurantTables}
            menuItems={restaurantMenuItems}
            ingredients={restaurantIngredients}
            orders={restaurantOrders}
            reservations={restaurantReservations}
            staffAccounts={activeRestaurant.staffAccounts || INITIAL_STAFF_ACCOUNTS}
            kitchenTickets={restaurantKitchenTickets}
            activeWaiterName={activeWaiterName}
            onChangeWaiterName={setActiveWaiterName}
            onUpdateTableOrder={handleUpdateOrder}
            onSendKOT={handleSendKOT}
            onUpdateTableStatus={handleUpdateTableStatus}
            onOpenSettleBillModal={handleOpenSettleBill}
            onOpenQuickSeatModal={(tableId) => {
              setModalInitialTableId(tableId);
              setIsWalkInModalOpen(true);
            }}
            onOpenThermalPrint={handleOpenThermalPrint}
            onOpenAiMenuImport={() => setIsAiMenuDigitizerOpen(true)}
            onNavigateToHostBoard={() => navigateToTab('service')}
            onNavigateToKitchen={() => navigateToTab('kitchen')}
          />
        )}

        {activeTab === 'kitchen' && (
          <KitchenDisplaySystem
            restaurantName={activeRestaurant.name}
            tickets={restaurantKitchenTickets}
            tables={restaurantTables}
            onUpdateTicketStatus={handleUpdateTicketStatus}
            onToggleItemCompleted={handleToggleItemCompleted}
            onNavigateToWaiterPad={() => navigateToTab('waiter')}
            onNavigateToHostBoard={() => navigateToTab('service')}
          />
        )}

        {activeTab === 'menu' && (
          <DigitalMenuManagement
            restaurantName={activeRestaurant.name}
            menuItems={restaurantMenuItems}
            ingredients={restaurantIngredients}
            onAddMenuItem={handleAddMenuItem}
            onUpdateMenuItem={handleUpdateMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            onToggleAvailability={handleToggleAvailability}
            onNavigateToInventory={() => navigateToTab('inventory')}
            onOpenAiMenuImport={() => setIsAiMenuDigitizerOpen(true)}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManagement
            restaurantId={activeRestaurant.id}
            restaurantName={activeRestaurant.name}
            ingredients={restaurantIngredients}
            menuItems={restaurantMenuItems}
            movements={restaurantMovements}
            onAddIngredient={handleAddIngredient}
            onRestockIngredient={handleRestockIngredient}
            onLogWastage={handleLogWastage}
            onSetIngredientStock={handleSetIngredientStock}
            onDeleteIngredient={handleDeleteIngredient}
            onUpdateDishRecipe={handleUpdateDishRecipe}
            onToggleDishAvailability={handleToggleAvailability}
          />
        )}

        {activeTab === 'marketing' && (
          <MarketingRetention
            restaurant={activeRestaurant}
            guests={restaurantGuests}
            tables={restaurantTables}
            feedbacks={feedbacks}
            onUpdateGuest={handleUpdateGuest}
            onAddFeedback={handleAddFeedback}
            onResolveFeedback={handleResolveFeedback}
            onNavigateToBooking={(guest) => {
              setEditingReservation(null);
              setModalInitialGuest(guest || null);
              setModalInitialTableId(undefined);
              setIsBookModalOpen(true);
            }}
            onSelectGuestForDossier={(guestId) => {
              setSelectedCrmGuestId(guestId);
              navigateToTab('guests');
            }}
          />
        )}

        {activeTab === 'reports' && (
          <DailyShiftSummary
            restaurant={activeRestaurant}
            tables={restaurantTables}
            reservations={restaurantReservations}
            orders={tableOrders}
            settledChecks={settledChecks}
          />
        )}

        {activeTab === 'settings' && (
          <RestaurantSettings
            restaurant={activeRestaurant}
            onUpdateRestaurant={handleUpdateRestaurant}
          />
        )}

        {activeTab === 'guests' && (
          <GuestDirectory
            guests={restaurantGuests}
            reservations={restaurantReservations}
            restaurantName={activeRestaurant.name}
            selectedGuestId={selectedCrmGuestId}
            onSelectGuest={setSelectedCrmGuestId}
            onOpenAddGuest={() => setIsAddGuestModalOpen(true)}
            onBookForGuest={(guest) => {
              setSelectedCrmGuestId(null);
              setEditingReservation(null);
              setModalInitialGuest(guest);
              setModalInitialTableId(undefined);
              setIsBookModalOpen(true);
            }}
            onUpdateGuest={handleUpdateGuest}
          />
        )}

        {activeTab === 'portal' && (
          <PublicBookingPortal
            restaurant={activeRestaurant}
            tables={restaurantTables}
            reservations={restaurantReservations}
            guests={restaurantGuests}
            onSubmitBooking={handleSaveBooking}
            onBackToDashboard={() => {
              navigateToTab('service');
            }}
          />
        )}
      </main>

      {/* QUIET HOSPITALITY FOOTER (Hidden in Waiter & KDS operational modes) */}
      {isHostStandMode && (
        <footer className="bg-white border-t border-[#E5E5E0] px-6 py-4 mt-12 mb-16 lg:mb-0">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <span className="font-serif-display font-bold text-stone-900 text-sm">
                MAISON
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {activeRestaurant.name} ({activeRestaurant.city})
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {restaurantTables.length} Tables / {restaurantGuests.length} Guests / {restaurantMenuItems.length} Menu Items
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleResetDemoData}
                className="text-stone-500 hover:text-stone-900 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* MOBILE & TABLET (< 1024px) STICKY OPERATIONAL VIEW SWITCHER BAR */}
      <nav
        aria-label="Mobile and tablet operational view switcher"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-md border-t border-stone-800 px-3 py-2 shadow-2xl"
      >
        <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto">
          {/* 1. Host Stand / Floor */}
          <button
            type="button"
            onClick={() => {
              navigateToTab('service');
              setServiceView('today');
            }}
            className={`min-h-[46px] px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all relative cursor-pointer ${
              isHostStandMode
                ? 'bg-white text-stone-950 font-bold shadow-sm'
                : 'text-stone-300 hover:text-white font-medium'
            }`}
          >
            <span aria-hidden="true">🛎️</span>
            <span className="truncate">Host Stand</span>
            {readyTicketsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            )}
          </button>

          {/* 2. Waiter Order Pad */}
          <button
            type="button"
            onClick={() => navigateToTab('waiter')}
            className={`min-h-[46px] px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all relative cursor-pointer ${
              activeTab === 'waiter'
                ? 'bg-[#C5A059] text-stone-950 font-bold shadow-sm'
                : 'text-stone-300 hover:text-white font-medium'
            }`}
          >
            <span aria-hidden="true">📱</span>
            <span className="truncate">Waiter Pad</span>
            {readyTicketsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            )}
          </button>

          {/* 3. Kitchen Display (KDS) */}
          <button
            type="button"
            onClick={() => navigateToTab('kitchen')}
            className={`min-h-[46px] px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all relative cursor-pointer ${
              activeTab === 'kitchen'
                ? 'bg-emerald-500 text-stone-950 font-bold shadow-sm'
                : 'text-stone-300 hover:text-white font-medium'
            }`}
          >
            <span aria-hidden="true">🍳</span>
            <span className="truncate">Kitchen KDS</span>
            {activeKitchenCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-stone-800 text-amber-400 border border-amber-500/40 font-mono">
                {activeKitchenCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* QUICK ACTION MODALS */}
      <BookTableModal
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setEditingReservation(null);
          setModalInitialGuest(null);
          setModalInitialTableId(undefined);
        }}
        tables={restaurantTables}
        guests={restaurantGuests}
        reservations={restaurantReservations}
        initialGuest={modalInitialGuest}
        initialTableId={modalInitialTableId}
        editingReservation={editingReservation}
        onSaveBooking={handleSaveBooking}
      />

      <QuickWalkInModal
        isOpen={isWalkInModalOpen}
        onClose={() => {
          setIsWalkInModalOpen(false);
          setModalInitialTableId(undefined);
        }}
        tables={restaurantTables}
        initialTableId={modalInitialTableId}
        currentShift={currentServiceShift}
        onSeatWalkIn={handleSeatWalkIn}
      />

      <AddGuestModal
        isOpen={isAddGuestModalOpen}
        onClose={() => setIsAddGuestModalOpen(false)}
        onAddGuest={handleAddGuest}
      />

      {/* DINE-IN TABLE ACTIVE ORDER DRAWER */}
      {activeDrawerTable && activeDrawerOrder && (
        <TableOrderDrawer
          isOpen={Boolean(activeDrawerTable)}
          onClose={() => setActiveDrawerTableId(null)}
          table={activeDrawerTable}
          reservation={activeDrawerReservation}
          order={activeDrawerOrder}
          menuItems={restaurantMenuItems}
          ingredients={restaurantIngredients}
          onUpdateOrder={handleUpdateOrder}
          onSendToKitchen={handleSendToKitchen}
          onOpenSettleBill={() => {
            handleOpenSettleBill(activeDrawerTable.id);
          }}
          onOpenThermalPrint={handleOpenThermalPrint}
        />
      )}

      {/* DINE-IN BILL SETTLEMENT MODAL */}
      {activeSettlementTable && activeSettlementOrder && (
        <BillSettlementModal
          isOpen={Boolean(activeSettlementTable)}
          onClose={() => setActiveSettlementTableId(null)}
          table={activeSettlementTable}
          reservation={activeSettlementReservation}
          order={activeSettlementOrder}
          guest={activeSettlementGuest}
          restaurantName={activeRestaurant.name}
          restaurantAddress={activeRestaurant.address}
          restaurantPhone={activeRestaurant.phone}
          restaurantProfile={activeRestaurant}
          onConfirmSettlement={handleConfirmSettlement}
          onAddFeedback={handleAddFeedback}
          onOpenThermalPrint={(mode) =>
            handleOpenThermalPrint(activeSettlementOrder.id, mode)
          }
        />
      )}

      {/* THERMAL RECEIPT & KOT PRINT MODAL (58mm / 80mm + UPI Dynamic QR) */}
      {thermalPrintState && thermalPrintOrder && thermalPrintTable && (
        <ThermalReceiptModal
          isOpen={Boolean(thermalPrintState)}
          onClose={() => setThermalPrintState(null)}
          initialMode={thermalPrintState.mode}
          order={thermalPrintOrder}
          table={thermalPrintTable}
          reservation={thermalPrintReservation}
          guest={thermalPrintGuest}
          restaurant={activeRestaurant}
          stewardName={thermalPrintOrder.waiterName || activeWaiterName}
          onVerifyUpiSettlement={
            thermalPrintOrder.status !== 'settled'
              ? () => handleVerifyUpiAndSettle(thermalPrintOrder)
              : undefined
          }
        />
      )}

      {/* AI MENU DIGITIZER MODAL (Photo & PDF Menu Import) */}
      <AiMenuDigitizerModal
        isOpen={isAiMenuDigitizerOpen}
        onClose={() => setIsAiMenuDigitizerOpen(false)}
        restaurantName={activeRestaurant.name}
        onConfirmImportItems={handleBulkAddMenuItems}
      />
    </div>
  );
}
