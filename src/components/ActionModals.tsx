import React, { useState, useEffect } from 'react';
import {
  RestaurantTable,
  GuestProfile,
  Reservation,
  ServiceShift,
} from '../types';
import {
  LUNCH_TIME_SLOTS,
  DINNER_TIME_SLOTS,
  AVAILABLE_GUEST_TAGS,
} from '../data/seedData';
import { getTodayDateString } from '../utils/date';
import {
  formatIndianPhone,
  getCleanIndianPhoneDigits,
  isValidIndianPhone,
} from '../utils/phone';
import { X, Calendar, Users, UserPlus, UtensilsCrossed, Check, AlertCircle } from 'lucide-react';

interface BookTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: RestaurantTable[];
  guests: GuestProfile[];
  reservations: Reservation[];
  initialGuest?: GuestProfile | null;
  initialTableId?: string;
  editingReservation?: Reservation | null;
  onSaveBooking: (bookingData: {
    id?: string;
    date: string;
    time: string;
    shift: ServiceShift;
    partySize: number;
    tableId: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    specialRequests: string;
  }) => void;
}

export const BookTableModal: React.FC<BookTableModalProps> = ({
  isOpen,
  onClose,
  tables,
  guests,
  reservations,
  initialGuest,
  initialTableId,
  editingReservation,
  onSaveBooking,
}) => {
  const todayStr = getTodayDateString();
  const [date, setDate] = useState(() => getTodayDateString());
  const [shift, setShift] = useState<ServiceShift>('Dinner');
  const [time, setTime] = useState('7:30 PM');
  const [partySize, setPartySize] = useState(2);
  const [tableId, setTableId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Populate initial state when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (editingReservation) {
      setDate(editingReservation.date);
      setShift(editingReservation.shift);
      setTime(editingReservation.time);
      setPartySize(editingReservation.partySize);
      setTableId(editingReservation.tableId);
      setGuestName(editingReservation.guestName);
      setGuestPhone(editingReservation.guestPhone);
      setGuestEmail(editingReservation.guestEmail || '');
      setSpecialRequests(editingReservation.specialRequests || '');
    } else {
      setDate(getTodayDateString());
      setShift('Dinner');
      setTime('7:30 PM');
      setPartySize(2);
      setGuestName(initialGuest?.name || '');
      setGuestPhone(initialGuest?.phone || '');
      setGuestEmail(initialGuest?.email || '');
      setSpecialRequests(
        initialGuest?.allergyWarnings && initialGuest.allergyWarnings !== 'None' && initialGuest.allergyWarnings !== 'No known allergies'
          ? `Allergy note: ${initialGuest.allergyWarnings}`
          : ''
      );
      if (initialTableId) {
        const preTable = tables.find((t) => t.id === initialTableId);
        if (preTable) {
          setPartySize(preTable.capacity);
          setTableId(preTable.id);
        }
      } else {
        setTableId('');
      }
    }
  }, [isOpen, editingReservation, initialGuest, initialTableId, tables]);

  // Filter tables to matching capacity (>= partySize) and check availability for that date/time
  const eligibleTables = tables.filter((t) => t.capacity >= partySize);

  const isTableBookedAtSlot = (tId: string) => {
    return reservations.some(
      (r) =>
        r.id !== editingReservation?.id &&
        r.tableId === tId &&
        r.date === date &&
        r.shift === shift &&
        (r.status === 'Confirmed' || r.status === 'Seated') &&
        r.time === time
    );
  };

  const availableTables = eligibleTables.filter((t) => {
    if (date === todayStr && t.status === 'Seated' && t.id !== editingReservation?.tableId && shift === 'Lunch') {
      // If booking right now during lunch and table is currently occupied, still allow dinner booking
    }
    return !isTableBookedAtSlot(t.id);
  });

  // Ensure a valid default tableId is selected
  useEffect(() => {
    if (!isOpen) return;
    const pool = availableTables.length > 0 ? availableTables : eligibleTables;
    if (pool.length > 0 && !pool.some((t) => t.id === tableId)) {
      setTableId(pool[0].id);
    }
  }, [partySize, date, shift, time, isOpen]);

  if (!isOpen) return null;

  const timeSlots = shift === 'Lunch' ? LUNCH_TIME_SLOTS : DINNER_TIME_SLOTS;

  const handleSelectExistingGuest = (guestId: string) => {
    const found = guests.find((g) => g.id === guestId);
    if (found) {
      setGuestName(found.name);
      setGuestPhone(found.phone);
      setGuestEmail(found.email || '');
      if (
        found.allergyWarnings &&
        found.allergyWarnings !== 'None' &&
        found.allergyWarnings !== 'No known allergies' &&
        !specialRequests
      ) {
        setSpecialRequests(`Allergy: ${found.allergyWarnings}. ${found.dietaryRestrictions || ''}`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    const rawDigits = getCleanIndianPhoneDigits(guestPhone);
    if (!guestName.trim()) return;
    if (rawDigits.length !== 10) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    if (!tableId) return;

    const formattedPhone = formatIndianPhone(guestPhone);
    onSaveBooking({
      id: editingReservation?.id,
      date,
      time,
      shift,
      partySize,
      tableId,
      guestName: guestName.trim(),
      guestPhone: formattedPhone,
      guestEmail: guestEmail.trim() || undefined,
      specialRequests: specialRequests.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-xl max-w-lg w-full shadow-xl overflow-hidden my-8">
        <div className="px-6 py-4 bg-[#FAF9F6] border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-stone-700" />
            <h3 className="text-lg font-semibold text-stone-900">
              {editingReservation ? 'Edit Reservation' : 'Book Table'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date, Shift & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono-tabular focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Service Shift *
              </label>
              <select
                value={shift}
                onChange={(e) => {
                  const newShift = e.target.value as ServiceShift;
                  setShift(newShift);
                  setTime(newShift === 'Lunch' ? '12:30 PM' : '7:30 PM');
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              >
                <option value="Lunch">Lunch Service</option>
                <option value="Dinner">Dinner Service</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Time Slot *
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono-tabular focus:outline-none focus:ring-2 focus:ring-stone-900"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Party Size & Assigned Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Party Size (Covers) *
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[2, 4, 6, 8].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPartySize(size)}
                    className={`py-2 text-xs font-mono-tabular font-medium rounded-lg border transition-colors ${
                      partySize === size
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {size} pax
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Assigned Table (Capacity ≥ {partySize}) *
              </label>
              <select
                required
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              >
                {(availableTables.length > 0 ? availableTables : eligibleTables).map(
                  (t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.zone} ({t.capacity} pax)
                      {t.status === 'Seated' && date === todayStr
                        ? ' [Currently Seated]'
                        : ' [Available]'}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Quick CRM Guest Selector */}
          {!editingReservation && (
            <div className="pt-2 border-t border-stone-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-stone-600">
                  Quick Fill from CRM Directory (Optional)
                </label>
                <span className="text-xs text-stone-400">
                  Auto-fills phone & allergy notes
                </span>
              </div>
              <select
                defaultValue=""
                onChange={(e) => handleSelectExistingGuest(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900"
              >
                <option value="">Select returning guest or enter new below...</option>
                {guests.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.phone}) · {g.totalVisits} visits
                    {g.tags.length > 0 ? ` · ${g.tags.join(', ')}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Guest Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Guest Full Name *
              </label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Eleanor Vance"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Phone Number (+91) *
              </label>
              <div className={`flex items-center rounded-lg border bg-white overflow-hidden transition-colors ${
                phoneError ? 'border-rose-400 ring-1 ring-rose-400' : 'border-stone-300 focus-within:ring-2 focus-within:ring-stone-900'
              }`}>
                <span className="px-2.5 py-2 bg-stone-100 border-r border-stone-200 text-xs font-semibold text-stone-700 font-mono select-none">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={getCleanIndianPhoneDigits(guestPhone)}
                  onChange={(e) => {
                    setPhoneError('');
                    const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                    setGuestPhone(cleaned);
                  }}
                  placeholder="98110 55019"
                  className="w-full px-3 py-2 text-sm bg-transparent font-mono-tabular focus:outline-none"
                />
              </div>
              {phoneError && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{phoneError}</span>
                </p>
              )}
            </div>
          </div>

          {/* Occasion / Notes */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Occasion, Dietary Notes & Special Requests
            </label>
            <textarea
              rows={2}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="e.g. Birthday dinner, prefers corner booth, shellfish allergy..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>
                {editingReservation ? 'Update Reservation' : 'Confirm Reservation'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface QuickWalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: RestaurantTable[];
  initialTableId?: string;
  currentShift: ServiceShift;
  onSeatWalkIn: (data: {
    partySize: number;
    tableId: string;
    guestName: string;
    guestPhone?: string;
    notes?: string;
    shift: ServiceShift;
  }) => void;
}

export const QuickWalkInModal: React.FC<QuickWalkInModalProps> = ({
  isOpen,
  onClose,
  tables,
  initialTableId,
  currentShift,
  onSeatWalkIn,
}) => {
  const freeTables = tables.filter((t) => t.status === 'Free');
  const [partySize, setPartySize] = useState<number>(2);
  const [tableId, setTableId] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const matchingFreeTables = freeTables.filter((t) => t.capacity >= partySize);
  const selectableTables =
    matchingFreeTables.length > 0 ? matchingFreeTables : freeTables;

  useEffect(() => {
    if (!isOpen) return;
    setGuestName('');
    setGuestPhone('');
    setNotes('');
    if (initialTableId) {
      const target = freeTables.find((t) => t.id === initialTableId);
      if (target) {
        setPartySize(target.capacity);
        setTableId(target.id);
        return;
      }
    }
    if (selectableTables.length > 0) {
      setTableId(selectableTables[0].id);
    }
  }, [isOpen, initialTableId]);

  useEffect(() => {
    if (!isOpen) return;
    if (
      selectableTables.length > 0 &&
      !selectableTables.some((t) => t.id === tableId)
    ) {
      setTableId(selectableTables[0].id);
    }
  }, [partySize, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableId) return;
    const cleanDigits = getCleanIndianPhoneDigits(guestPhone);
    const formattedPhone = cleanDigits.length === 10 ? formatIndianPhone(guestPhone) : (guestPhone.trim() || undefined);
    onSeatWalkIn({
      partySize,
      tableId,
      guestName: guestName.trim() || 'Walk-in Guest',
      guestPhone: formattedPhone,
      notes: notes.trim() || undefined,
      shift: currentShift,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-xl max-w-md w-full shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-[#FAF9F6] border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UtensilsCrossed className="w-4 h-4 text-stone-700" />
            <h3 className="text-lg font-semibold text-stone-900">
              Quick Walk-in Seating
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {freeTables.length === 0 ? (
          <div className="p-6 text-center space-y-4">
            <p className="text-sm text-stone-700">
              All tables are currently occupied. Complete dining on an active table first to seat a walk-in party.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Party Size *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 6, 8].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPartySize(size)}
                    className={`py-2 text-xs font-mono-tabular font-medium rounded-lg border transition-colors ${
                      partySize === size
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {size} pax
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Select Free Table ({freeTables.length} Currently Free) *
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {selectableTables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTableId(t.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      tableId === t.id
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-800 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-tabular font-semibold text-sm">
                        {t.name}
                      </span>
                      <span
                        className={`text-xs font-mono-tabular ${
                          tableId === t.id ? 'text-stone-300' : 'text-stone-500'
                        }`}
                      >
                        {t.capacity} pax
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${
                        tableId === t.id ? 'text-stone-300' : 'text-stone-500'
                      }`}
                    >
                      {t.zone}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Guest Name (Optional)
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Defaults to Walk-in Guest"
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Phone (+91 Optional)
                </label>
                <div className="flex items-center rounded-lg border border-stone-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-stone-900 transition-colors">
                  <span className="px-2.5 py-2 bg-stone-100 border-r border-stone-200 text-xs font-semibold text-stone-700 font-mono select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={getCleanIndianPhoneDigits(guestPhone)}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setGuestPhone(cleaned);
                    }}
                    placeholder="98110 55019"
                    className="w-full px-3 py-2 text-sm bg-transparent font-mono-tabular focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Quick Table Note (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Patio walk-in, ordering drinks first"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 text-white text-xs font-medium rounded-lg hover:bg-emerald-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Users className="w-4 h-4" />
                <span>Seat Now & Start Visit</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGuest: (guest: {
    name: string;
    phone: string;
    email?: string;
    tags: string[];
    dietaryRestrictions: string;
    allergyWarnings: string;
    personalNotes: string;
  }) => void;
}

export const AddGuestModal: React.FC<AddGuestModalProps> = ({
  isOpen,
  onClose,
  onAddGuest,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [email, setEmail] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Regular']);
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [allergyWarnings, setAllergyWarnings] = useState('');
  const [personalNotes, setPersonalNotes] = useState('');

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    if (!name.trim()) return;
    const cleanDigits = getCleanIndianPhoneDigits(phone);
    if (cleanDigits.length !== 10) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    const formattedPhone = formatIndianPhone(phone);
    onAddGuest({
      name: name.trim(),
      phone: formattedPhone,
      email: email.trim() || undefined,
      tags: selectedTags,
      dietaryRestrictions: dietaryRestrictions.trim() || 'None',
      allergyWarnings: allergyWarnings.trim() || 'No known allergies',
      personalNotes: personalNotes.trim(),
    });
    setName('');
    setPhone('');
    setPhoneError('');
    setEmail('');
    setSelectedTags(['Regular']);
    setDietaryRestrictions('');
    setAllergyWarnings('');
    setPersonalNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-xl max-w-lg w-full shadow-xl overflow-hidden my-8">
        <div className="px-6 py-4 bg-[#FAF9F6] border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-4 h-4 text-stone-700" />
            <h3 className="text-lg font-semibold text-stone-900">
              Add Guest to CRM Directory
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sebastien Moreau"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Phone Number (+91) *
              </label>
              <div className={`flex items-center rounded-lg border bg-white overflow-hidden transition-colors ${
                phoneError ? 'border-rose-400 ring-1 ring-rose-400' : 'border-stone-300 focus-within:ring-2 focus-within:ring-stone-900'
              }`}>
                <span className="px-2.5 py-2 bg-stone-100 border-r border-stone-200 text-xs font-semibold text-stone-700 font-mono select-none">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={getCleanIndianPhoneDigits(phone)}
                  onChange={(e) => {
                    setPhoneError('');
                    const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                    setPhone(cleaned);
                  }}
                  placeholder="98110 55019"
                  className="w-full px-3 py-2 text-sm bg-transparent font-mono-tabular focus:outline-none"
                />
              </div>
              {phoneError && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{phoneError}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sebastien@moreau.co"
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              Hospitality Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_GUEST_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {active ? `✓ ${tag}` : tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Dietary Preferences
              </label>
              <input
                type="text"
                value={dietaryRestrictions}
                onChange={(e) => setDietaryRestrictions(e.target.value)}
                placeholder="e.g. Vegetarian, Pescatarian"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Allergy Warnings
              </label>
              <input
                type="text"
                value={allergyWarnings}
                onChange={(e) => setAllergyWarnings(e.target.value)}
                placeholder="e.g. Tree nuts, shellfish"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Personal Notes & Table Preferences
            </label>
            <textarea
              rows={2}
              value={personalNotes}
              onChange={(e) => setPersonalNotes(e.target.value)}
              placeholder="e.g. Prefers Courtyard corner tables, enjoys grower Champagne..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Save Guest Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
