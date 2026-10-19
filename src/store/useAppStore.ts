import { useState, useEffect, useMemo } from 'react';
import {
  RestaurantProfile,
  RestaurantTable,
  GuestProfile,
  Reservation,
  MenuItem,
  Ingredient,
  InventoryMovement,
  TableOrder,
  GuestFeedback,
  KitchenTicket,
  SettledCheckRecord,
} from '../types';
import {
  INITIAL_RESTAURANTS,
  INITIAL_TABLES,
  INITIAL_GUESTS,
  INITIAL_RESERVATIONS,
  INITIAL_MENU_ITEMS,
  INITIAL_ORDERS,
  INITIAL_FEEDBACKS,
  INITIAL_KITCHEN_TICKETS,
  INITIAL_INGREDIENTS,
  INITIAL_INVENTORY_MOVEMENTS,
} from '../data/seedData';
import {
  alignSeedReservationsWithToday,
  alignSeedOrdersWithToday,
  calculateTurnMinutes,
} from '../utils/date';

export const STORAGE_KEY = 'maison_hospitality_crm_state_v1';

/**
 * Helper to determine if an order is currently open (active, preparing, or ready — not settled).
 */
export function isOrderOpen(order: TableOrder): boolean {
  return order.status !== 'settled';
}

export interface RecipeMappingEntry {
  menuItemId: string;
  dishName: string;
  ingredients: Array<{
    inventoryId: string;
    qtyNeeded: number;
    unit: string;
  }>;
}

/**
 * Centralized Application Store Hook (Waiter -> Kitchen -> Inventory -> Settlement -> CRM -> Z-Report)
 */
export function useAppStore() {
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.restaurants?.length) {
          return parsed.restaurants.map((r: RestaurantProfile) =>
            r.id === 'rest-1' && r.name === 'Maison Lumière'
              ? { ...r, name: 'Rohan Kitchen', slug: 'rohan-kitchen-mumbai' }
              : r
          );
        }
      }
    } catch {}
    return INITIAL_RESTAURANTS;
  });

  const [activeRestaurantId, setActiveRestaurantId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeRestaurantId) return parsed.activeRestaurantId;
      }
    } catch {}
    return INITIAL_RESTAURANTS[0].id;
  });

  const [tables, setTables] = useState<RestaurantTable[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tables?.length) return parsed.tables;
      }
    } catch {}
    return INITIAL_TABLES;
  });

  const [guests, setGuests] = useState<GuestProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.guests?.length) return parsed.guests;
      }
    } catch {}
    return INITIAL_GUESTS;
  });

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.reservations?.length) {
          return alignSeedReservationsWithToday(
            parsed.reservations,
            INITIAL_RESERVATIONS
          );
        }
      }
    } catch {}
    return INITIAL_RESERVATIONS;
  });

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.menuItems?.length) {
          const savedItems: MenuItem[] = parsed.menuItems;
          const merged = savedItems.map((item) => {
            const seedMatch = INITIAL_MENU_ITEMS.find((s) => s.id === item.id);
            if (
              seedMatch &&
              (!item.recipe || item.recipe.length === 0) &&
              seedMatch.recipe
            ) {
              return { ...item, recipe: seedMatch.recipe };
            }
            return item;
          });
          const missingSeeds = INITIAL_MENU_ITEMS.filter(
            (s) => !merged.some((m) => m.id === s.id)
          );
          return [...missingSeeds, ...merged];
        }
      }
    } catch {}
    return INITIAL_MENU_ITEMS;
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.ingredients?.length) return parsed.ingredients;
      }
    } catch {}
    return INITIAL_INGREDIENTS;
  });

  const [inventoryMovements, setInventoryMovements] = useState<
    InventoryMovement[]
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.inventoryMovements?.length) return parsed.inventoryMovements;
      }
    } catch {}
    return INITIAL_INVENTORY_MOVEMENTS;
  });

  const [tableOrders, setTableOrders] = useState<TableOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tableOrders?.length) {
          return alignSeedOrdersWithToday(parsed.tableOrders, INITIAL_ORDERS);
        }
      }
    } catch {}
    return INITIAL_ORDERS;
  });

  const [feedbacks, setFeedbacks] = useState<GuestFeedback[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.feedbacks?.length) return parsed.feedbacks;
      }
    } catch {}
    return INITIAL_FEEDBACKS;
  });

  const [kitchenTickets, setKitchenTickets] = useState<KitchenTicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.kitchenTickets?.length) return parsed.kitchenTickets;
      }
    } catch {}
    return INITIAL_KITCHEN_TICKETS;
  });

  // Synchronize to localStorage on every state update
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          restaurants,
          activeRestaurantId,
          tables,
          guests,
          reservations,
          menuItems,
          ingredients,
          inventoryMovements,
          tableOrders,
          feedbacks,
          kitchenTickets,
        })
      );
    } catch {}
  }, [
    restaurants,
    activeRestaurantId,
    tables,
    guests,
    reservations,
    menuItems,
    ingredients,
    inventoryMovements,
    tableOrders,
    feedbacks,
    kitchenTickets,
  ]);

  // Cross-tab live sync listener
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.restaurants) setRestaurants(parsed.restaurants);
          if (parsed.tables) setTables(parsed.tables);
          if (parsed.guests) setGuests(parsed.guests);
          if (parsed.reservations) setReservations(parsed.reservations);
          if (parsed.menuItems) setMenuItems(parsed.menuItems);
          if (parsed.ingredients) setIngredients(parsed.ingredients);
          if (parsed.inventoryMovements)
            setInventoryMovements(parsed.inventoryMovements);
          if (parsed.tableOrders) setTableOrders(parsed.tableOrders);
          if (parsed.feedbacks) setFeedbacks(parsed.feedbacks);
          if (parsed.kitchenTickets) setKitchenTickets(parsed.kitchenTickets);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  // Derived recipes mapping
  const recipes = useMemo<RecipeMappingEntry[]>(() => {
    return menuItems
      .filter((m) => m.recipe && m.recipe.length > 0)
      .map((m) => ({
        menuItemId: m.id,
        dishName: m.name,
        ingredients: (m.recipe || []).map((r) => ({
          inventoryId: r.ingredientId,
          qtyNeeded: r.quantity,
          unit: r.unit,
        })),
      }));
  }, [menuItems]);

  // Derived settledChecks list of all paid bills
  const settledChecks = useMemo<SettledCheckRecord[]>(() => {
    return tableOrders
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
  }, [tableOrders, reservations]);

  return {
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
    inventory: ingredients,
    setInventory: setIngredients,
    inventoryMovements,
    setInventoryMovements,
    tableOrders,
    setTableOrders,
    orders: tableOrders,
    setOrders: setTableOrders,
    feedbacks,
    setFeedbacks,
    kitchenTickets,
    setKitchenTickets,
    recipes,
    settledChecks,
  };
}
