export type TableZone = 'Main Hall' | 'Courtyard' | 'Bar' | 'Private Room';

export type TableCapacity = 2 | 4 | 6 | 8;

export type TableStatus = 'Free' | 'Seated' | 'Bill Requested';

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  name: string;
  zone: TableZone;
  capacity: TableCapacity;
  status: TableStatus;
  currentReservationId?: string;
  currentOrderId?: string;
}

export type GuestTag =
  | 'VIP'
  | 'Regular'
  | 'New Guest'
  | 'Vegetarian'
  | 'Wine Lover'
  | 'Nut Allergy'
  | 'Chef Table'
  | 'Gluten-Free'
  | 'Anniversary';

export interface PastVisitRecord {
  id: string;
  date: string;
  time: string;
  shift: 'Lunch' | 'Dinner';
  tableName: string;
  partySize: number;
  status: 'Completed' | 'No-Show' | 'Cancelled' | 'Confirmed' | 'Seated';
  spend: number;
  notes?: string;
}

export type FeedbackTag = 'Ambience' | 'Food Quality' | 'Service' | 'Value';

export interface GuestFeedback {
  id: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  rating: number; // 1 to 5 stars
  tags: FeedbackTag[];
  comment?: string;
  date: string;
  tableName?: string;
  billAmount?: number;
  status: 'resolved' | 'action_required';
  managerFollowUpNote?: string;
}

export type SmartSegmentId =
  | 'vip_regulars'
  | 'lapsed_diners'
  | 'upcoming_celebrations'
  | 'new_first_timers';

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  targetSegment: SmartSegmentId;
  defaultText: string;
}

export interface GuestProfile {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  email?: string;
  totalVisits: number;
  lastVisited: string;
  lifetimeSpend: number;
  averagePartySize: number;
  tags: string[];
  dietaryRestrictions: string;
  allergyWarnings: string;
  personalNotes: string;
  preferredZone?: TableZone;
  celebrationType?: 'Birthday' | 'Anniversary';
  celebrationDate?: string; // e.g. "October 24"
  favoriteDish?: string;
  feedback?: GuestFeedback[];
  needsManagerFollowUp?: boolean;
  history: PastVisitRecord[];
}

export type ReservationStatus =
  | 'Confirmed'
  | 'Seated'
  | 'Completed'
  | 'No-Show'
  | 'Cancelled';

export type ServiceShift = 'Lunch' | 'Dinner';

export type SeatingPreference = 'Indoor' | 'Outdoor / Patio' | 'No preference';

export type SpecialOccasion =
  | 'None'
  | 'Birthday'
  | 'Anniversary'
  | 'Business Dinner'
  | 'Date Night';

export interface Reservation {
  id: string;
  referenceCode?: string;
  restaurantId: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestTags: string[];
  date: string; // YYYY-MM-DD
  time: string; // e.g. "12:30 PM"
  shift: ServiceShift;
  partySize: number;
  tableId: string;
  tableName: string;
  tableZone: TableZone;
  status: ReservationStatus;
  specialRequests: string;
  seatingPreference?: SeatingPreference;
  occasion?: SpecialOccasion;
  bookedVia?: 'Host Stand' | 'Public Portal';
  createdAt: string;
  seatedAt?: string;
  completedAt?: string;
  estimatedSpend?: number;
}

export type StaffRole = 'Owner' | 'Floor Manager' | 'Host' | 'Server';

export interface StaffAccount {
  id: string;
  name: string;
  role: StaffRole;
  pin: string;
  active: boolean;
  phone?: string;
  avatar?: string;
}

export interface RestaurantProfile {
  id: string;
  name: string;
  cuisine: string;
  city: string;
  slug: string;
  lunchStart: string;
  lunchEnd: string;
  dinnerStart: string;
  dinnerEnd: string;
  onboardingCompleted: boolean;
  address?: string;
  phone?: string;
  logoUrl?: string;
  currencySymbol?: string;
  gstin?: string; // 15-character Indian GST identification
  fssaiNumber?: string; // 14-digit FSSAI license number
  state?: string;
  slotDurationMinutes?: number;
  bufferMinutes?: number;
  taxRate?: number;
  serviceChargeEnabled?: boolean;
  serviceChargeRate?: number;
  serviceChargeNote?: string; // "Discretionary / Voluntary"
  upiId?: string; // e.g. maison@okhdfcbank
  pinProtectionEnabled?: boolean;
  staffAccounts?: StaffAccount[];
}

export type MenuCategory =
  | 'Starters'
  | 'Appetizers'
  | 'Tandoor'
  | 'Curries'
  | 'Biryani'
  | 'Mains'
  | 'Breads'
  | 'Desserts'
  | 'Beverages'
  | 'Chef Specials';

export type DietaryType = 'Veg' | 'Non-Veg' | 'Vegan';

export type IngredientCategory =
  | 'Dairy'
  | 'Poultry/Meat'
  | 'Dry Staples'
  | 'Produce'
  | 'Spices';

export type MeasurementUnit = 'kg' | 'g' | 'L' | 'ml' | 'pcs';

export interface Ingredient {
  id: string;
  restaurantId: string;
  name: string;
  category: IngredientCategory;
  unit: MeasurementUnit;
  currentStock: number;
  minThreshold: number;
  costPerUnit: number; // in ₹
  updatedAt: string;
}

export interface RecipeIngredientItem {
  ingredientId: string;
  quantity: number;
  unit: MeasurementUnit;
}

export type InventoryMovementType =
  | 'order_deduction'
  | 'restock'
  | 'wastage'
  | 'manual_adjustment';

export interface InventoryMovement {
  id: string;
  restaurantId: string;
  ingredientId: string;
  ingredientName: string;
  type: InventoryMovementType;
  quantity: number; // positive for add, negative for deduct
  unit: MeasurementUnit;
  balanceAfter: number;
  reason: string;
  timestamp: string;
  staffName?: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  dietary: DietaryType;
  isAvailable: boolean; // In Stock (true) / 86'd (false)
  manualOverrideAvailable?: boolean; // "Mark Available anyway" override
  recipe?: RecipeIngredientItem[];
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  sentToKitchen: boolean;
  sentAt?: string;
  inventoryDeductedQty?: number;
}

export type PaymentMode =
  | 'UPI (GPay/PhonePe/Paytm)'
  | 'Cash'
  | 'Card'
  | 'Split'
  | 'House Credit (Khata)';

export type KdsTicketStatus = 'pending' | 'preparing' | 'ready' | 'completed';

export interface KitchenTicketItem {
  id: string;
  orderItemId: string;
  name: string;
  quantity: number;
  notes?: string;
  dietary?: DietaryType;
  completed?: boolean;
}

export interface KitchenTicket {
  id: string;
  kotNumber: string; // e.g. "KOT #101"
  restaurantId: string;
  orderId: string;
  tableId: string;
  tableName: string;
  waiterName: string;
  guestName: string;
  partySize?: number;
  items: KitchenTicketItem[];
  status: KdsTicketStatus;
  createdAt: string; // ISO timestamp
  startedAt?: string;
  readyAt?: string;
  completedAt?: string;
}

export type OrderLifecycleStatus = 'active' | 'preparing' | 'ready' | 'settled';

export interface TableOrder {
  id: string;
  restaurantId: string;
  tableId: string;
  tableName: string;
  reservationId?: string;
  guestId?: string;
  guestName: string;
  guestPhone?: string;
  partySize?: number;
  waiterName?: string;
  isBillRequested?: boolean;
  kotCount?: number;
  kotList?: KitchenTicket[];
  items: OrderItem[];
  taxRate: number; // 0.05 (5%: 2.5% CGST + 2.5% SGST) or 0.18 (18%: 9% CGST + 9% SGST)
  discountType: 'none' | 'percent' | 'fixed';
  discountValue: number;
  createdAt: string;
  updatedAt: string;
  status: OrderLifecycleStatus;
  settledAt?: string;
  paymentMethod?: PaymentMode;
  subtotal: number;
  cgstAmount?: number;
  sgstAmount?: number;
  taxAmount: number;
  serviceChargeAmount?: number;
  discountAmount: number;
  grandTotal: number;
  splitBreakdown?: {
    cash?: number;
    upi?: number;
    card?: number;
  };
  receiptCode?: string;
}

export interface SettledCheckRecord {
  id: string;
  orderId: string;
  restaurantId: string;
  tableId: string;
  tableName: string;
  guestId?: string;
  guestName: string;
  guestPhone?: string;
  covers: number;
  paymentMethod: PaymentMode;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  discountAmount: number;
   netRevenue?: number;
  grandTotal: number;
  receiptCode: string;
  seatedAt: string;
  timestamp: string;
  turnMinutes: number;
  shift: ServiceShift;
  splitBreakdown?: {
    cash?: number;
    upi?: number;
    card?: number;
  };
}

export type PrimaryTab =
  | 'service'
  | 'guests'
  | 'menu'
  | 'inventory'
  | 'marketing'
  | 'reports'
  | 'settings'
  | 'onboarding'
  | 'portal'
  | 'waiter'
  | 'kitchen';
export type ServiceBoardView = 'today' | 'upcoming' | 'floor';
export type ShiftFilter = 'all' | 'Lunch' | 'Dinner';
