import React, { useState, useMemo } from 'react';
import {
  RestaurantProfile,
  RestaurantTable,
  Reservation,
  GuestProfile,
  ServiceShift,
  SeatingPreference,
  SpecialOccasion,
} from '../types';
import {
  LUNCH_TIME_SLOTS,
  DINNER_TIME_SLOTS,
} from '../data/seedData';
import { getTodayDateString } from '../utils/date';
import {
  formatIndianPhone,
  getCleanIndianPhoneDigits,
} from '../utils/phone';
import {
  ArrowLeft,
  Calendar,
  Check,
  MapPin,
  Clock,
  Users,
  Phone,
  Sparkles,
  Share2,
  CalendarPlus,
  Copy,
  Utensils,
  UserCheck,
  ChevronRight,
} from 'lucide-react';

interface PublicBookingPortalProps {
  restaurant: RestaurantProfile;
  tables: RestaurantTable[];
  reservations: Reservation[];
  guests: GuestProfile[];
  onSubmitBooking: (data: {
    referenceCode: string;
    date: string;
    time: string;
    shift: ServiceShift;
    partySize: number;
    tableId: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    seatingPreference: SeatingPreference;
    occasion: SpecialOccasion;
    specialRequests: string;
  }) => void;
  onBackToDashboard: () => void;
}

const PARTY_OPTIONS = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '7', value: 7 },
  { label: '8+', value: 8 },
];

const SEATING_PREFERENCES: SeatingPreference[] = [
  'Indoor',
  'Outdoor / Patio',
  'No preference',
];

const OCCASION_OPTIONS: SpecialOccasion[] = [
  'None',
  'Birthday',
  'Anniversary',
  'Business Dinner',
  'Date Night',
];

// Helper to parse "12:30 PM" into minutes since midnight for dining window overlap check
function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// Generate 14 days starting from TODAY_DATE ("2026-10-18")
function generateNext14Days(baseDateStr: string) {
  const [year, month, day] = baseDateStr.split('-').map(Number);
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  for (let i = 0; i < 14; i++) {
    const d = new Date(year, month - 1, day + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    days.push({
      iso,
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : dayNames[d.getDay()],
      dayNumber: d.getDate(),
      monthName: monthNames[d.getMonth()],
      fullLabel: `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`,
    });
  }
  return days;
}

// Build Google Calendar URL for a 2-hour reservation
function buildGoogleCalendarUrl(params: {
  restaurantName: string;
  address?: string;
  date: string;
  time: string;
  partySize: number;
  referenceCode: string;
  seatingPreference: string;
}) {
  const [year, month, day] = params.date.split('-').map(Number);
  const startMins = parseTimeToMinutes(params.time);
  const startH = Math.floor(startMins / 60);
  const startM = startMins % 60;

  const endMins = startMins + 120; // 2 hours
  const endH = Math.floor(endMins / 60) % 24;
  const endM = endMins % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const startStr = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00`;
  const endStr = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(endM)}00`;

  const title = `Table Reservation at ${params.restaurantName} (${params.partySize} Guests)`;
  const details = `Booking Reference: ${params.referenceCode}\nParty Size: ${params.partySize} Guests\nSeating Preference: ${params.seatingPreference}\nBooked via MAISON Online Portal.`;
  const location = params.address || params.restaurantName;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${startStr}/${endStr}&details=${encodeURIComponent(
    details
  )}&location=${encodeURIComponent(location)}`;
}

export const PublicBookingPortal: React.FC<PublicBookingPortalProps> = ({
  restaurant,
  tables,
  reservations,
  guests,
  onSubmitBooking,
  onBackToDashboard,
}) => {
  const todayStr = getTodayDateString();
  const next14Days = useMemo(() => generateNext14Days(todayStr), [todayStr]);

  // Step 1: Party Size
  const [partySize, setPartySize] = useState<number>(2);
  const [isEightPlus, setIsEightPlus] = useState<boolean>(false);

  // Step 2: Date & Time
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [selectedTime, setSelectedTime] = useState<string>('7:30 PM');
  const [selectedShift, setSelectedShift] = useState<ServiceShift>('Dinner');

  // Step 3: Diner Contact Details
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [seatingPreference, setSeatingPreference] =
    useState<SeatingPreference>('No preference');
  const [occasion, setOccasion] = useState<SpecialOccasion>('None');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // Step 4: Instant Confirmation Screen State
  const [confirmedBooking, setConfirmedBooking] = useState<{
    referenceCode: string;
    guestName: string;
    guestPhone: string;
    date: string;
    dateLabel: string;
    time: string;
    shift: ServiceShift;
    partySizeLabel: string;
    partySize: number;
    tableName: string;
    tableZone: string;
    seatingPreference: SeatingPreference;
    occasion: SpecialOccasion;
    specialRequests: string;
    isReturningGuest: boolean;
  } | null>(null);

  const [copiedSummary, setCopiedSummary] = useState(false);

  // Determine which tables can accommodate a given partySize, date, time, and seatingPreference
  const getAvailableTablesForSlot = (
    dateStr: string,
    timeSlot: string,
    size: number,
    pref: SeatingPreference = 'No preference'
  ): RestaurantTable[] => {
    const slotMins = parseTimeToMinutes(timeSlot);

    // Filter tables that fit the party size (and don't waste an 8-top on 1-2 guests unless no smaller tables exist)
    const sizeEligible = tables.filter((t) => {
      if (t.capacity < size) return false;
      // Keep table sizing realistic: a party of 1-2 fits 2-top or 4-top; 3-4 fits 4-top or 6-top; 5-6 fits 6-top or 8-top; 7-8+ fits 8-top
      if (size <= 2) return t.capacity <= 4;
      if (size <= 4) return t.capacity <= 6;
      return true;
    });

    const pool =
      sizeEligible.length > 0
        ? sizeEligible
        : tables.filter((t) => t.capacity >= size);

    // Filter by seating preference if specified
    const prefFiltered =
      pref === 'Indoor'
        ? pool.filter((t) => t.zone !== 'Courtyard')
        : pref === 'Outdoor / Patio'
        ? pool.filter((t) => t.zone === 'Courtyard')
        : pool;

    const candidateTables = prefFiltered.length > 0 ? prefFiltered : pool;

    // Exclude tables that already have an active reservation within 45 minutes of this slot on the same date
    return candidateTables.filter((table) => {
      const hasConflict = reservations.some((res) => {
        if (res.date !== dateStr) return false;
        if (res.tableId !== table.id) return false;
        if (res.status === 'Cancelled' || res.status === 'No-Show' || res.status === 'Completed') {
          return false;
        }
        const resMins = parseTimeToMinutes(res.time);
        return Math.abs(resMins - slotMins) <= 45;
      });
      return !hasConflict;
    });
  };

  // Check if phone number matches an existing CRM Guest Profile
  const matchedCrmGuest = useMemo(() => {
    const digits = guestPhone.replace(/[^0-9]/g, '');
    if (digits.length < 7) return null;
    const last10 = digits.slice(-10);
    return (
      guests.find((g) => {
        const gDigits = g.phone.replace(/[^0-9]/g, '');
        return gDigits.length >= 7 && gDigits.slice(-10) === last10;
      }) || null
    );
  }, [guestPhone, guests]);

  // Auto-fill guest name & email if phone number matches an existing CRM guest and name is still empty
  const handlePhoneChange = (val: string) => {
    setPhoneError('');
    const cleanedDigits = getCleanIndianPhoneDigits(val);
    setGuestPhone(cleanedDigits);
    if (cleanedDigits.length === 10) {
      const found = guests.find(
        (g) => getCleanIndianPhoneDigits(g.phone) === cleanedDigits
      );
      if (found && !guestName.trim()) {
        setGuestName(found.name);
        if (found.email && !guestEmail.trim()) {
          setGuestEmail(found.email);
        }
      }
    }
  };

  // Auto-select first available time slot if current selection becomes unavailable
  const handlePartySizeSelect = (val: number, eightPlus: boolean) => {
    setPartySize(val);
    setIsEightPlus(eightPlus);
    const currentAvail = getAvailableTablesForSlot(
      selectedDate,
      selectedTime,
      val,
      seatingPreference
    );
    if (currentAvail.length === 0) {
      const allSlots = [
        ...DINNER_TIME_SLOTS.map((t) => ({ t, s: 'Dinner' as ServiceShift })),
        ...LUNCH_TIME_SLOTS.map((t) => ({ t, s: 'Lunch' as ServiceShift })),
      ];
      const firstOpen = allSlots.find(
        (item) =>
          getAvailableTablesForSlot(selectedDate, item.t, val, seatingPreference)
            .length > 0
      );
      if (firstOpen) {
        setSelectedTime(firstOpen.t);
        setSelectedShift(firstOpen.s);
      }
    }
  };

  const availableTablesForCurrentSelection = getAvailableTablesForSlot(
    selectedDate,
    selectedTime,
    partySize,
    seatingPreference
  );

  const selectedDateObj =
    next14Days.find((d) => d.iso === selectedDate) || next14Days[0];

  const handleCompleteBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    if (!guestName.trim()) return;

    const rawDigits = getCleanIndianPhoneDigits(guestPhone);
    if (rawDigits.length !== 10) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    const formattedPhone = formatIndianPhone(guestPhone);

    const candidateTables =
      availableTablesForCurrentSelection.length > 0
        ? availableTablesForCurrentSelection
        : tables.filter((t) => t.capacity >= partySize);

    const chosenTable = candidateTables[0] || tables[0];
    if (!chosenTable) return;

    const refCode = `MSN-${Math.floor(1000 + Math.random() * 9000)}`;

    // Compose combined special requests string for the host stand
    const noteParts: string[] = [];
    if (occasion !== 'None') noteParts.push(`Occasion: ${occasion}`);
    if (seatingPreference !== 'No preference')
      noteParts.push(`Seating Pref: ${seatingPreference}`);
    if (isEightPlus) noteParts.push('Large Party (8+ Guests)');
    if (specialRequests.trim()) noteParts.push(specialRequests.trim());
    const combinedNotes = noteParts.join(' · ');

    onSubmitBooking({
      referenceCode: refCode,
      date: selectedDate,
      time: selectedTime,
      shift: selectedShift,
      partySize,
      tableId: chosenTable.id,
      guestName: guestName.trim(),
      guestPhone: formattedPhone,
      guestEmail: guestEmail.trim() || undefined,
      seatingPreference,
      occasion,
      specialRequests: combinedNotes,
    });

    setConfirmedBooking({
      referenceCode: refCode,
      guestName: guestName.trim(),
      guestPhone: formattedPhone,
      date: selectedDate,
      dateLabel: selectedDateObj.fullLabel,
      time: selectedTime,
      shift: selectedShift,
      partySizeLabel: isEightPlus ? '8+ Guests' : `${partySize} ${partySize === 1 ? 'Guest' : 'Guests'}`,
      partySize,
      tableName: chosenTable.name,
      tableZone: chosenTable.zone,
      seatingPreference,
      occasion,
      specialRequests: combinedNotes,
      isReturningGuest: Boolean(matchedCrmGuest),
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Manager "View as Guest" Context Bar */}
      <div className="bg-stone-900 text-white px-5 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono-tabular text-emerald-400 font-medium">
            Route: /book
          </span>
          <span aria-hidden="true" className="text-stone-600">
            ·
          </span>
          <span>
            Customer-Facing Public Booking Portal — Bookings sync live to Service Board &amp; Guest CRM
          </span>
        </div>
        <button
          type="button"
          onClick={onBackToDashboard}
          className="px-3.5 py-1.5 bg-white text-stone-900 hover:bg-stone-100 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Guest View (Back to Host Board)</span>
        </button>
      </div>

      {/* Luxury Hospitality Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
              <span className="font-medium text-emerald-800">
                Open for reservations
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {restaurant.cuisine || 'Contemporary French & Raw Bar'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{restaurant.city}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900 font-serif-display tracking-tight">
              {restaurant.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 pt-1">
              {restaurant.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{restaurant.address}</span>
                </span>
              )}
              {restaurant.phone && (
                <span className="flex items-center gap-1.5 font-mono-tabular">
                  <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{restaurant.phone}</span>
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-stone-500 font-mono-tabular space-y-1 md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-stone-100">
            <div>
              Lunch Service: {restaurant.lunchStart} – {restaurant.lunchEnd}
            </div>
            <div>
              Dinner Service: {restaurant.dinnerStart} – {restaurant.dinnerEnd}
            </div>
          </div>
        </div>
      </div>

      {/* STEP 4: INSTANT CONFIRMATION SCREEN */}
      {confirmedBooking ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 max-w-3xl mx-auto space-y-8 shadow-xs">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-xs font-mono-tabular uppercase tracking-widest text-emerald-800 font-semibold">
              Instant Table Confirmation
            </p>
            <h2 className="text-3xl font-semibold text-stone-900 font-serif-display">
              We look forward to welcoming you, {confirmedBooking.guestName}
            </h2>
            <p className="text-sm text-stone-600 max-w-md mx-auto">
              Your table reservation at {restaurant.name} is confirmed and registered with our host stand.
            </p>
          </div>

          {/* Booking Reference Dossier */}
          <div className="p-6 bg-[#FAF9F6] border border-stone-200 rounded-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs text-stone-500 block">
                  Booking Reference Code
                </span>
                <span className="text-xl font-bold font-mono-tabular text-stone-900">
                  {confirmedBooking.referenceCode}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-500 block">
                  CRM Guest Status
                </span>
                <span className="text-xs font-semibold text-emerald-800">
                  {confirmedBooking.isReturningGuest
                    ? 'Linked to Existing Guest Profile'
                    : 'Profile Created with "New Guest" Tag'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-stone-500 block">Date</span>
                <span className="font-semibold text-stone-900 font-mono-tabular mt-0.5 block">
                  {confirmedBooking.dateLabel}
                </span>
                <span className="text-stone-400 font-mono-tabular">
                  ({confirmedBooking.date})
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Time &amp; Shift</span>
                <span className="font-semibold text-stone-900 font-mono-tabular mt-0.5 block">
                  {confirmedBooking.time}
                </span>
                <span className="text-stone-500">
                  {confirmedBooking.shift} Service
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Party Size</span>
                <span className="font-semibold text-stone-900 font-mono-tabular mt-0.5 block">
                  {confirmedBooking.partySizeLabel}
                </span>
                <span className="text-stone-500">
                  {confirmedBooking.seatingPreference}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Assigned Table</span>
                <span className="font-semibold text-stone-900 font-mono-tabular mt-0.5 block">
                  Table {confirmedBooking.tableName}
                </span>
                <span className="text-stone-500">
                  {confirmedBooking.tableZone}
                </span>
              </div>
            </div>

            {confirmedBooking.specialRequests && (
              <div className="pt-3 border-t border-stone-200 text-xs text-stone-600">
                <span className="font-semibold text-stone-800">
                  Notes &amp; Preferences:{' '}
                </span>
                {confirmedBooking.specialRequests}
              </div>
            )}

            {/* Restaurant Contact Details */}
            <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
              <span>
                {restaurant.name} · {restaurant.address}
              </span>
              <span className="font-mono-tabular">
                Host Desk: {restaurant.phone || '+1 (212) 555-0194'}
              </span>
            </div>
          </div>

          {/* Action Buttons: Add to Google Calendar & Share on WhatsApp */}
          {(() => {
            const gcalUrl = buildGoogleCalendarUrl({
              restaurantName: restaurant.name,
              address: restaurant.address,
              date: confirmedBooking.date,
              time: confirmedBooking.time,
              partySize: confirmedBooking.partySize,
              referenceCode: confirmedBooking.referenceCode,
              seatingPreference: confirmedBooking.seatingPreference,
            });

            const whatsappSummary = `Reservation Confirmed at ${restaurant.name}!\nReference: ${confirmedBooking.referenceCode}\nDate: ${confirmedBooking.dateLabel} (${confirmedBooking.date})\nTime: ${confirmedBooking.time} (${confirmedBooking.shift})\nParty: ${confirmedBooking.partySizeLabel}\nTable: ${confirmedBooking.tableName} (${confirmedBooking.tableZone})\nAddress: ${restaurant.address || restaurant.city}`;

            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
              whatsappSummary
            )}`;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href={gcalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[46px] px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>Add to Google Calendar</span>
                  </a>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[46px] px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share on WhatsApp</span>
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(whatsappSummary)
                        .catch(() => {});
                      setCopiedSummary(true);
                      setTimeout(() => setCopiedSummary(false), 2000);
                    }}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {copiedSummary
                        ? 'Copied Booking Summary!'
                        : 'Copy Summary Text'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmedBooking(null);
                        setGuestName('');
                        setGuestPhone('');
                        setGuestEmail('');
                        setSpecialRequests('');
                      }}
                      className="px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-medium rounded-lg transition-colors"
                    >
                      Book Another Table
                    </button>

                    <button
                      type="button"
                      onClick={onBackToDashboard}
                      className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span>View on Live Service Board</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* STEPS 1, 2, 3 RESERVATION FLOW + DESKTOP LIVE SUMMARY SIDEBAR */
        <form
          onSubmit={handleCompleteBooking}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left 8 Columns: Interactive 3-Step Reservation Builder */}
          <div className="lg:col-span-8 space-y-6">
            {/* STEP 1: PARTY SIZE SELECTOR */}
            <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    01. Select Party Size
                  </h2>
                  <p className="text-xs text-stone-500">
                    Choose the number of guests for your table
                  </p>
                </div>
                <span className="text-xs font-mono-tabular font-semibold text-stone-800">
                  {isEightPlus ? '8+ Guests' : `${partySize} ${partySize === 1 ? 'Guest' : 'Guests'}`}
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PARTY_OPTIONS.map((opt) => {
                  const isSelected =
                    opt.label === '8+'
                      ? isEightPlus
                      : !isEightPlus && partySize === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        handlePartySizeSelect(opt.value, opt.label === '8+')
                      }
                      className={`min-h-[46px] rounded-xl font-mono-tabular text-sm font-semibold border transition-colors flex items-center justify-center ${
                        isSelected
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-[#FAF9F6] text-stone-800 border-stone-200 hover:border-stone-400 hover:bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* STEP 2: DATE & TIME PICKER (14-Day Strip + Lunch & Dinner Slots) */}
            <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    02. Select Date &amp; Seating Time
                  </h2>
                  <p className="text-xs text-stone-500">
                    Showing live availability for the next 14 days based on table capacity
                  </p>
                </div>
                <span className="text-xs font-mono-tabular text-stone-700 font-medium">
                  {selectedDateObj.fullLabel} · {selectedTime}
                </span>
              </div>

              {/* 14-Day Interactive Horizontal Date Strip */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">
                  Next 14 Days ({next14Days[0].monthName} {next14Days[0].dayNumber} – {next14Days[13].monthName} {next14Days[13].dayNumber})
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {next14Days.map((d) => {
                    const active = d.iso === selectedDate;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setSelectedDate(d.iso)}
                        className={`min-w-[68px] min-h-[68px] px-3 py-2.5 rounded-xl border text-center transition-colors shrink-0 flex flex-col items-center justify-center ${
                          active
                            ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                            : 'bg-[#FAF9F6] text-stone-800 border-stone-200 hover:border-stone-400 hover:bg-white'
                        }`}
                      >
                        <span
                          className={`text-[11px] font-medium ${
                            active ? 'text-stone-300' : 'text-stone-500'
                          }`}
                        >
                          {d.dayName}
                        </span>
                        <span className="text-base font-bold font-mono-tabular mt-0.5">
                          {d.dayNumber}
                        </span>
                        <span
                          className={`text-[10px] ${
                            active ? 'text-stone-300' : 'text-stone-400'
                          }`}
                        >
                          {d.monthName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lunch Slots */}
              <div className="space-y-2.5 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-900">
                    Lunch Slots ({restaurant.lunchStart} – {restaurant.lunchEnd})
                  </span>
                  <span className="text-xs text-stone-500">
                    Midday Service
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {LUNCH_TIME_SLOTS.map((slot) => {
                    const availTables = getAvailableTablesForSlot(
                      selectedDate,
                      slot,
                      partySize,
                      seatingPreference
                    );
                    const isFull = availTables.length === 0;
                    const isSelected =
                      selectedTime === slot && selectedShift === 'Lunch';

                    return (
                      <button
                        key={`lunch-${slot}`}
                        type="button"
                        disabled={isFull}
                        onClick={() => {
                          setSelectedTime(slot);
                          setSelectedShift('Lunch');
                        }}
                        className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-xs font-mono-tabular transition-colors flex flex-col items-center justify-center ${
                          isFull
                            ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                            : 'bg-[#FAF9F6] text-stone-800 border-stone-200 hover:border-stone-400 hover:bg-white'
                        }`}
                      >
                        <span>{slot}</span>
                        <span
                          className={`text-[10px] ${
                            isFull
                              ? 'text-stone-400 no-underline'
                              : isSelected
                              ? 'text-stone-300'
                              : 'text-stone-500'
                          }`}
                        >
                          {isFull
                            ? 'Booked'
                            : `${availTables.length} ${
                                availTables.length === 1 ? 'table' : 'tables'
                              }`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dinner Slots */}
              <div className="space-y-2.5 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-900">
                    Dinner Slots ({restaurant.dinnerStart} – {restaurant.dinnerEnd})
                  </span>
                  <span className="text-xs text-stone-500">
                    Evening Service
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {DINNER_TIME_SLOTS.map((slot) => {
                    const availTables = getAvailableTablesForSlot(
                      selectedDate,
                      slot,
                      partySize,
                      seatingPreference
                    );
                    const isFull = availTables.length === 0;
                    const isSelected =
                      selectedTime === slot && selectedShift === 'Dinner';

                    return (
                      <button
                        key={`dinner-${slot}`}
                        type="button"
                        disabled={isFull}
                        onClick={() => {
                          setSelectedTime(slot);
                          setSelectedShift('Dinner');
                        }}
                        className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-xs font-mono-tabular transition-colors flex flex-col items-center justify-center ${
                          isFull
                            ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                            : 'bg-[#FAF9F6] text-stone-800 border-stone-200 hover:border-stone-400 hover:bg-white'
                        }`}
                      >
                        <span>{slot}</span>
                        <span
                          className={`text-[10px] ${
                            isFull
                              ? 'text-stone-400 no-underline'
                              : isSelected
                              ? 'text-stone-300'
                              : 'text-stone-500'
                          }`}
                        >
                          {isFull
                            ? 'Booked'
                            : `${availTables.length} ${
                                availTables.length === 1 ? 'table' : 'tables'
                              }`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* STEP 3: DINER CONTACT DETAILS */}
            <section className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  03. Diner Contact Details &amp; Preferences
                </h2>
                <p className="text-xs text-stone-500">
                  Enter your contact details for instant confirmation and WhatsApp updates
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Mobile / WhatsApp Number (+91) *
                  </label>
                  <div className={`flex items-center rounded-xl border bg-white overflow-hidden transition-colors ${
                    phoneError ? 'border-rose-400 ring-1 ring-rose-400' : 'border-stone-300 focus-within:ring-2 focus-within:ring-stone-900'
                  }`}>
                    <span className="px-3.5 py-3 bg-stone-100 border-r border-stone-200 text-xs font-semibold text-stone-700 font-mono select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={getCleanIndianPhoneDigits(guestPhone)}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="98110 55019"
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-transparent font-mono-tabular focus:outline-none"
                    />
                  </div>
                  {phoneError ? (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                      <span>{phoneError}</span>
                    </p>
                  ) : guestPhone.length >= 7 && (
                    <p className="text-[11px] mt-1 font-medium text-emerald-800 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      {matchedCrmGuest ? (
                        <span>
                          Welcome back, {matchedCrmGuest.name} ({matchedCrmGuest.totalVisits} past visits)
                        </span>
                      ) : (
                        <span>
                          New guest number — will be added to CRM as &ldquo;New Guest&rdquo;
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="guest@domain.com"
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Special Occasion
                  </label>
                  <select
                    value={occasion}
                    onChange={(e) =>
                      setOccasion(e.target.value as SpecialOccasion)
                    }
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                  >
                    {OCCASION_OPTIONS.map((occ) => (
                      <option key={occ} value={occ}>
                        {occ === 'None' ? 'No special occasion' : occ}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Seating Preference Selector */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-2">
                  Seating Preference
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {SEATING_PREFERENCES.map((pref) => {
                    const active = seatingPreference === pref;
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => setSeatingPreference(pref)}
                        className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${
                          active
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-[#FAF9F6] text-stone-700 border-stone-200 hover:border-stone-400 hover:bg-white'
                        }`}
                      >
                        {pref}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dietary requirements or special requests */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Dietary Requirements or Special Requests
                </label>
                <textarea
                  rows={3}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Allergies, dietary restrictions, wine decanting requests, or seating notes..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={availableTablesForCurrentSelection.length === 0}
                  className="w-full min-h-[48px] px-6 py-3.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Calendar className="w-4 h-4" />
                  <span>
                    Confirm Reservation for{' '}
                    {isEightPlus ? '8+ Guests' : `${partySize} ${partySize === 1 ? 'Guest' : 'Guests'}`}{' '}
                    · {selectedTime}
                  </span>
                </button>
              </div>
            </section>
          </div>

          {/* Right 4 Columns: Live Reservation Summary Card */}
          <aside className="lg:col-span-4 bg-white border border-stone-200 rounded-2xl p-6 space-y-5 lg:sticky lg:top-6">
            <div className="border-b border-stone-200 pb-4">
              <p className="text-xs text-stone-500">Reservation Summary</p>
              <h3 className="text-xl font-semibold text-stone-900 font-serif-display mt-0.5">
                {restaurant.name}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {restaurant.cuisine || 'Contemporary French & Raw Bar'}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Party Size</span>
                <span className="font-mono-tabular font-semibold text-stone-900">
                  {isEightPlus ? '8+ Guests' : `${partySize} ${partySize === 1 ? 'Guest' : 'Guests'}`}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Selected Date</span>
                <span className="font-mono-tabular font-semibold text-stone-900">
                  {selectedDateObj.fullLabel} ({selectedDate})
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Seating Time</span>
                <span className="font-mono-tabular font-semibold text-stone-900">
                  {selectedTime} ({selectedShift})
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Seating Preference</span>
                <span className="font-medium text-stone-900">
                  {seatingPreference}
                </span>
              </div>

              {occasion !== 'None' && (
                <div className="flex items-center justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-500">Special Occasion</span>
                  <span className="font-medium text-stone-900">{occasion}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-2">
                <span className="text-stone-500">Matching Tables Open</span>
                <span className="font-mono-tabular font-semibold text-emerald-700">
                  {availableTablesForCurrentSelection.length > 0
                    ? `Table ${availableTablesForCurrentSelection[0].name} (${availableTablesForCurrentSelection[0].zone})`
                    : 'Slot Full'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-[#FAF9F6] border border-stone-200 rounded-xl space-y-2 text-xs text-stone-600">
              <p className="font-semibold text-stone-900">
                Hospitality Policy &amp; Direct Sync
              </p>
              <p>
                We hold reserved tables for 15 minutes past your reservation time. Your booking immediately syncs with our host stand and sommelier team.
              </p>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
};
