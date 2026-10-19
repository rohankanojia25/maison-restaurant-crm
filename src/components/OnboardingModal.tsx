import React, { useState } from 'react';
import {
  RestaurantProfile,
  RestaurantTable,
  TableZone,
  TableCapacity,
} from '../types';
import {
  Check,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Utensils,
  LayoutGrid,
  Link2,
  X,
} from 'lucide-react';

interface OnboardingViewProps {
  restaurant: RestaurantProfile;
  tables: RestaurantTable[];
  initialStep?: 1 | 2 | 3;
  onUpdateRestaurant: (updated: Partial<RestaurantProfile>) => void;
  onAddTable: (table: Omit<RestaurantTable, 'id' | 'restaurantId' | 'status'>) => void;
  onDeleteTable: (tableId: string) => void;
  onOpenTestBookingPage: () => void;
  onClose: () => void;
}

const ZONES: TableZone[] = ['Main Hall', 'Courtyard', 'Bar', 'Private Room'];
const CAPACITIES: TableCapacity[] = [2, 4, 6, 8];

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  restaurant,
  tables,
  initialStep = 1,
  onUpdateRestaurant,
  onAddTable,
  onDeleteTable,
  onOpenTestBookingPage,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);

  // Step 1 form state
  const [name, setName] = useState(restaurant.name);
  const [city, setCity] = useState(restaurant.city);
  const [lunchStart, setLunchStart] = useState(restaurant.lunchStart);
  const [lunchEnd, setLunchEnd] = useState(restaurant.lunchEnd);
  const [dinnerStart, setDinnerStart] = useState(restaurant.dinnerStart);
  const [dinnerEnd, setDinnerEnd] = useState(restaurant.dinnerEnd);
  const [address, setAddress] = useState(restaurant.address || '');
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Step 2 form state
  const [newTableName, setNewTableName] = useState('');
  const [newTableZone, setNewTableZone] = useState<TableZone>('Main Hall');
  const [newTableCapacity, setNewTableCapacity] = useState<TableCapacity>(4);

  // Step 3 copy state
  const [copied, setCopied] = useState(false);

  const shareablePath = `/book?venue=${restaurant.slug || 'maison'}`;
  const fullShareableUrl = `${window.location.origin}/book?venue=${restaurant.slug || 'maison'}`;

  const handleSaveStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = (name || 'maison')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    onUpdateRestaurant({
      name: name.trim() || 'Maison Lumière',
      city: city.trim() || 'Mumbai',
      slug,
      lunchStart,
      lunchEnd,
      dinnerStart,
      dinnerEnd,
      address,
    });
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2000);
    setStep(2);
  };

  const getNextAutoTableName = (prefix: string) => {
    let index = 1;
    while (
      tables.some(
        (t) => t.name.toUpperCase() === `${prefix}${index}`.toUpperCase()
      )
    ) {
      index++;
    }
    return `${prefix}${index}`;
  };

  const handleQuickAddPreset = (capacity: TableCapacity) => {
    const prefixMap: Record<TableZone, string> = {
      'Main Hall': 'T',
      Courtyard: 'C',
      Bar: 'B',
      'Private Room': 'PR',
    };
    const prefix = prefixMap[newTableZone] || 'T';
    const generatedName = getNextAutoTableName(prefix);
    onAddTable({
      name: generatedName,
      zone: newTableZone,
      capacity,
    });
  };

  const handleCustomAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    const prefixMap: Record<TableZone, string> = {
      'Main Hall': 'T',
      Courtyard: 'C',
      Bar: 'B',
      'Private Room': 'PR',
    };
    const finalName =
      newTableName.trim() || getNextAutoTableName(prefixMap[newTableZone]);
    onAddTable({
      name: finalName,
      zone: newTableZone,
      capacity: newTableCapacity,
    });
    setNewTableName('');
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(fullShareableUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCompleteOnboarding = () => {
    onUpdateRestaurant({ onboardingCompleted: true });
    onClose();
  };

  const totalSeats = tables.reduce((acc, t) => acc + t.capacity, 0);

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="px-6 py-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4 bg-[#FAF9F6]">
        <div>
          <p className="text-xs font-medium text-stone-500">
            Guided Restaurant Onboarding · 3-Step Configuration
          </p>
          <h2 className="text-2xl font-semibold text-stone-900 mt-0.5">
            Setup Guide for {restaurant.name}
          </h2>
        </div>

        {/* Stepper Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              step === 1
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>01. Restaurant Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              step === 2
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>02. Table Setup ({tables.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              step === 3
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>03. Booking Portal Link</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close setup guide"
            className="ml-2 p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step 1: Restaurant Profile */}
      {step === 1 && (
        <form onSubmit={handleSaveStep1} className="p-6 md:p-8 space-y-6">
          <div className="max-w-3xl space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">
                01. Restaurant Profile & Shift Hours
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Configure your venue identity, location, and standard Lunch and Dinner service windows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maison Lumière"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai, Delhi NCR, Bengaluru"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Street Address (Optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 48 Mercer Street, Colaba, Mumbai"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lunch Shift */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900">
                    Lunch Service Hours
                  </span>
                  <span className="text-xs text-stone-500 font-mono-tabular">
                    {lunchStart} – {lunchEnd}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">
                      Start Time
                    </label>
                    <select
                      value={lunchStart}
                      onChange={(e) => setLunchStart(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
                    >
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="12:30 PM">12:30 PM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">
                      End Time
                    </label>
                    <select
                      value={lunchEnd}
                      onChange={(e) => setLunchEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
                    >
                      <option value="3:00 PM">3:00 PM</option>
                      <option value="3:30 PM">3:30 PM</option>
                      <option value="4:00 PM">4:00 PM</option>
                      <option value="4:30 PM">4:30 PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dinner Shift */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900">
                    Dinner Service Hours
                  </span>
                  <span className="text-xs text-stone-500 font-mono-tabular">
                    {dinnerStart} – {dinnerEnd}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">
                      Start Time
                    </label>
                    <select
                      value={dinnerStart}
                      onChange={(e) => setDinnerStart(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
                    >
                      <option value="5:30 PM">5:30 PM</option>
                      <option value="6:00 PM">6:00 PM</option>
                      <option value="6:30 PM">6:30 PM</option>
                      <option value="7:00 PM">7:00 PM</option>
                      <option value="7:30 PM">7:30 PM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">
                      End Time
                    </label>
                    <select
                      value={dinnerEnd}
                      onChange={(e) => setDinnerEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
                    >
                      <option value="10:00 PM">10:00 PM</option>
                      <option value="10:30 PM">10:30 PM</option>
                      <option value="11:00 PM">11:00 PM</option>
                      <option value="11:30 PM">11:30 PM</option>
                      <option value="12:00 AM">12:00 AM</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-stone-200">
              <div className="text-xs text-stone-600">
                {profileSavedToast ? (
                  <span className="text-emerald-700 font-medium">
                    Profile saved. Moving to Table Setup...
                  </span>
                ) : (
                  <span>Changes update your live service schedule immediately.</span>
                )}
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Save & Continue to Table Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Step 2: Table Setup */}
      {step === 2 && (
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">
                02. Floor & Table Configuration
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Assign table numbers, dining zones, and guest capacities. Currently configured:{' '}
                <span className="font-mono-tabular font-semibold text-stone-900">
                  {tables.length} tables ({totalSeats} total covers)
                </span>
                .
              </p>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-500 mr-1">
                Quick add in {newTableZone}:
              </span>
              <button
                type="button"
                onClick={() => handleQuickAddPreset(2)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                + Add 2-top
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset(4)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                + Add 4-top
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset(6)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                + Add 6-top
              </button>
            </div>
          </div>

          {/* Custom Table Creator Row */}
          <form
            onSubmit={handleCustomAddTable}
            className="p-4 bg-[#FAF9F6] border border-stone-200 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Table Number / Name
              </label>
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g. T5 or Patio 1"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Dining Zone
              </label>
              <select
                value={newTableZone}
                onChange={(e) => setNewTableZone(e.target.value as TableZone)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Capacity (Pax)
              </label>
              <select
                value={newTableCapacity}
                onChange={(e) =>
                  setNewTableCapacity(Number(e.target.value) as TableCapacity)
                }
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              >
                {CAPACITIES.map((c) => (
                  <option key={c} value={c}>
                    {c} pax
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5 h-[38px] whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Table</span>
            </button>
          </form>

          {/* Configured Tables List by Zone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ZONES.map((zone) => {
              const zoneTables = tables.filter((t) => t.zone === zone);
              if (zoneTables.length === 0) return null;
              return (
                <div
                  key={zone}
                  className="border border-stone-200 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-[#FAF9F6] border-b border-stone-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900">
                      {zone}
                    </span>
                    <span className="text-xs text-stone-500 font-mono-tabular">
                      {zoneTables.length} tables ·{' '}
                      {zoneTables.reduce((s, t) => s + t.capacity, 0)} pax
                    </span>
                  </div>
                  <div className="divide-y divide-stone-200">
                    {zoneTables.map((t) => (
                      <div
                        key={t.id}
                        className="px-4 py-2.5 flex items-center justify-between text-sm hover:bg-stone-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono-tabular font-semibold text-stone-900 w-10">
                            {t.name}
                          </span>
                          <span className="text-xs text-stone-500">
                            {t.capacity} pax capacity · {t.status}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteTable(t.id)}
                          disabled={t.status === 'Seated'}
                          title={
                            t.status === 'Seated'
                              ? 'Cannot delete while guests are seated'
                              : 'Remove table'
                          }
                          className="p-1.5 text-stone-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-medium text-stone-700 hover:text-stone-900 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Restaurant Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2.5 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <span>Continue to Booking Portal Link</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Booking Portal Link */}
      {step === 3 && (
        <div className="p-6 md:p-8 space-y-6">
          <div className="max-w-2xl space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">
                03. Shareable Public Booking Portal
              </h3>
              <p className="text-sm text-stone-600 mt-1">
                Share this direct booking link on your Instagram bio, Google Business listing, or website. Reservations made on the portal appear immediately on your Live Service Board.
              </p>
            </div>

            <div className="p-5 bg-[#FAF9F6] border border-stone-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Public Reservation Endpoint</span>
                <span className="font-mono-tabular text-emerald-700 font-medium">
                  Active · Instant Sync
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 px-4 py-3 bg-white border border-stone-300 rounded-lg font-mono-tabular text-sm text-stone-900 select-all flex items-center justify-between">
                  <span>{shareablePath}</span>
                  <span className="text-xs text-stone-400 hidden md:inline">
                    ({restaurant.name})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-3 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied Link!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onOpenTestBookingPage}
                  className="px-4 py-3 bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Test Booking Page</span>
                </button>
              </div>

              <div className="text-xs text-stone-500 flex flex-wrap items-center gap-2 pt-1">
                <span>Lunch: {restaurant.lunchStart} – {restaurant.lunchEnd}</span>
                <span aria-hidden="true">·</span>
                <span>Dinner: {restaurant.dinnerStart} – {restaurant.dinnerEnd}</span>
                <span aria-hidden="true">·</span>
                <span>{tables.length} bookable tables across {new Set(tables.map((t) => t.zone)).size} zones</span>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-medium text-stone-700 hover:text-stone-900 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Table Setup</span>
              </button>

              <button
                type="button"
                onClick={handleCompleteOnboarding}
                className="px-5 py-2.5 bg-emerald-700 text-white text-xs font-medium rounded-lg hover:bg-emerald-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Finish Setup & Open Service Board</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
