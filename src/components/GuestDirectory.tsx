import React, { useState } from 'react';
import { GuestProfile, Reservation } from '../types';
import { AVAILABLE_GUEST_TAGS } from '../data/seedData';
import { formatCurrency } from '../utils/currency';
import {
  Search,
  UserPlus,
  X,
  MessageCircle,
  CalendarPlus,
  Check,
  Copy,
  ExternalLink,
  AlertCircle,
  Utensils,
} from 'lucide-react';

interface GuestDirectoryProps {
  guests: GuestProfile[];
  reservations: Reservation[];
  restaurantName: string;
  selectedGuestId: string | null;
  onSelectGuest: (guestId: string | null) => void;
  onOpenAddGuest: () => void;
  onBookForGuest: (guest: GuestProfile) => void;
  onUpdateGuest: (guestId: string, updated: Partial<GuestProfile>) => void;
}

export const GuestDirectory: React.FC<GuestDirectoryProps> = ({
  guests,
  reservations,
  restaurantName,
  selectedGuestId,
  onSelectGuest,
  onOpenAddGuest,
  onBookForGuest,
  onUpdateGuest,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('All');

  const filteredGuests = guests.filter((g) => {
    if (tagFilter !== 'All' && !g.tags.includes(tagFilter)) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const digitsOnly = q.replace(/[^0-9]/g, '');
    const guestDigits = g.phone.replace(/[^0-9]/g, '');

    return (
      g.name.toLowerCase().includes(q) ||
      g.phone.toLowerCase().includes(q) ||
      (digitsOnly.length > 0 && guestDigits.includes(digitsOnly)) ||
      (g.email && g.email.toLowerCase().includes(q)) ||
      g.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const selectedGuest = guests.find((g) => g.id === selectedGuestId) || null;

  return (
    <div className="space-y-6">
      {/* Top CRM Controls Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Instant Search by Phone or Name */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Instant search by guest name or phone number..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-[#FAF9F6] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>

          {/* Interactive Tag Filter Controls */}
          <div className="inline-flex items-center gap-1 p-1 bg-stone-100 rounded-lg overflow-x-auto">
            {['All', ...AVAILABLE_GUEST_TAGS].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(tag)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  tagFilter === tag
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tag === 'All' ? `All Guests (${guests.length})` : tag}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddGuest}
          className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Guest</span>
        </button>
      </div>

      {/* Guest Directory High-Density Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-[#FAF9F6] border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              Guest Relationship Directory
            </h2>
            <p className="text-xs text-stone-500">
              Click any guest row to open their full hospitality dossier, allergy warnings, and reservation history
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-stone-500">
            {filteredGuests.length} profiles
          </span>
        </div>

        {filteredGuests.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-stone-600">
              No guest profiles match &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={onOpenAddGuest}
              className="px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-colors"
            >
              + Create New Guest Profile
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-[#FAF9F6] text-xs font-semibold text-stone-600">
                  <th className="py-3 px-6">Guest Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-right">Total Visits</th>
                  <th className="py-3 px-4">Last Visited</th>
                  <th className="py-3 px-4 text-right">Lifetime Spend</th>
                  <th className="py-3 px-6">Tags & Dietary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-sm">
                {filteredGuests.map((guest) => {
                  const isSelected = guest.id === selectedGuestId;
                  return (
                    <tr
                      key={guest.id}
                      onClick={() => onSelectGuest(guest.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-stone-100'
                          : 'hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-stone-900">
                          {guest.name}
                        </div>
                        {guest.email && (
                          <div className="text-xs text-stone-500">
                            {guest.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-xs text-stone-700 whitespace-nowrap">
                        {guest.phone}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-stone-900">
                        {guest.totalVisits}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-xs text-stone-600 whitespace-nowrap">
                        {guest.lastVisited}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular font-medium text-stone-900">
                        {formatCurrency(guest.lifetimeSpend)}
                      </td>
                      <td className="py-3.5 px-6 text-xs text-stone-600">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {guest.needsManagerFollowUp && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded font-bold text-[10px] flex items-center gap-1 animate-pulse">
                              <AlertCircle className="w-3 h-3 text-red-600" />
                              Action Required: Manager Follow-up
                            </span>
                          )}
                          {guest.tags.length > 0 ? (
                            <span className="font-medium text-stone-800">
                              {guest.tags.join(' · ')}
                            </span>
                          ) : (
                            <span className="text-stone-400">Standard</span>
                          )}
                          {guest.celebrationDate && (
                            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-mono-tabular">
                              {guest.celebrationType || 'Milestone'}: {guest.celebrationDate}
                            </span>
                          )}
                          {guest.allergyWarnings &&
                            guest.allergyWarnings !== 'None' &&
                            guest.allergyWarnings !== 'No known allergies' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-amber-700 font-medium">
                                  Allergy Note
                                </span>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comprehensive Slide-over Profile Drawer */}
      {selectedGuest && (
        <GuestSlideOverProfile
          guest={selectedGuest}
          reservations={reservations.filter(
            (r) =>
              r.guestId === selectedGuest.id ||
              r.guestName.toLowerCase() === selectedGuest.name.toLowerCase()
          )}
          restaurantName={restaurantName}
          onClose={() => onSelectGuest(null)}
          onBookForGuest={() => onBookForGuest(selectedGuest)}
          onUpdateGuest={(updated) => onUpdateGuest(selectedGuest.id, updated)}
        />
      )}
    </div>
  );
};

interface GuestSlideOverProfileProps {
  guest: GuestProfile;
  reservations: Reservation[];
  restaurantName: string;
  onClose: () => void;
  onBookForGuest: () => void;
  onUpdateGuest: (updated: Partial<GuestProfile>) => void;
}

export const GuestSlideOverProfile: React.FC<GuestSlideOverProfileProps> = ({
  guest,
  reservations,
  restaurantName,
  onClose,
  onBookForGuest,
  onUpdateGuest,
}) => {
  const [dietary, setDietary] = useState(guest.dietaryRestrictions);
  const [allergies, setAllergies] = useState(guest.allergyWarnings);
  const [notes, setNotes] = useState(guest.personalNotes);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  // Sync local state when switching guests
  React.useEffect(() => {
    setDietary(guest.dietaryRestrictions);
    setAllergies(guest.allergyWarnings);
    setNotes(guest.personalNotes);
  }, [guest.id, guest.dietaryRestrictions, guest.allergyWarnings, guest.personalNotes]);

  const cleanPhone = guest.phone.replace(/[^0-9]/g, '');
  const firstName = guest.name.split(' ')[0];
  const personalizedGreeting = `Bonjour ${firstName}, warm greetings from ${restaurantName}! We would be delighted to welcome you back to your favorite table soon. Let us know if we may reserve a table for you this week.`;
  const waMeUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    personalizedGreeting
  )}`;

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateGuest({
      dietaryRestrictions: dietary,
      allergyWarnings: allergies,
      personalNotes: notes,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const toggleGuestTag = (tag: string) => {
    const exists = guest.tags.includes(tag);
    const updatedTags = exists
      ? guest.tags.filter((t) => t !== tag)
      : [...guest.tags, tag];
    onUpdateGuest({ tags: updatedTags });
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard?.writeText(waMeUrl).catch(() => {});
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-[1px] flex justify-end">
      <div className="bg-white border-l border-stone-200 w-full max-w-xl h-full overflow-y-auto shadow-2xl flex flex-col justify-between">
        <div className="p-6 space-y-6">
          {/* Slide-over Header */}
          <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span>CRM Guest Dossier</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{guest.phone}</span>
              </div>
              <h2 className="text-2xl font-semibold text-stone-900 mt-1">
                {guest.name}
              </h2>
              {guest.email && (
                <p className="text-xs text-stone-500 mt-0.5">{guest.email}</p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close guest profile"
              className="p-2 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Required: Manager Follow-up Banner if flagged */}
          {guest.needsManagerFollowUp && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-red-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Action Required: Manager Follow-up Active</span>
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateGuest({ needsManagerFollowUp: false })}
                  className="px-2.5 py-1 bg-red-800 hover:bg-red-900 text-white text-[11px] font-semibold rounded-md transition-colors"
                >
                  Clear Flag
                </button>
              </div>
              <p className="text-xs text-red-800 leading-relaxed">
                This diner experienced a service or food quality issue. Management follow-up has been flagged for resolution.
              </p>
            </div>
          )}

          {/* Primary Actions: WhatsApp + Book Table */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={waMeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send WhatsApp Message</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                type="button"
                onClick={handleCopyWhatsApp}
                title="Copy WhatsApp wa.me link"
                className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {copiedWa ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Copied wa.me</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onBookForGuest}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Book Table</span>
              </button>
            </div>

            {/* Preview of personalized wa.me greeting */}
            <div className="p-3 bg-[#FAF9F6] border border-stone-200 rounded-lg text-xs text-stone-600">
              <div className="flex items-center justify-between text-stone-400 mb-1 font-mono-tabular">
                <span>wa.me/{cleanPhone}</span>
                <span>Personalized Greeting Preview</span>
              </div>
              <p className="italic text-stone-700">&ldquo;{personalizedGreeting}&rdquo;</p>
            </div>
          </div>

          {/* Visit Summary & Average Party Size */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 bg-[#FAF9F6] border border-stone-200 rounded-lg">
              <p className="text-xs text-stone-500">Total Visits</p>
              <p className="text-xl font-semibold text-stone-900 font-mono-tabular mt-0.5">
                {guest.totalVisits}
              </p>
            </div>
            <div className="p-3.5 bg-[#FAF9F6] border border-stone-200 rounded-lg">
              <p className="text-xs text-stone-500">Avg Party Size</p>
              <p className="text-xl font-semibold text-stone-900 font-mono-tabular mt-0.5">
                {guest.averagePartySize.toFixed(1)} pax
              </p>
            </div>
            <div className="p-3.5 bg-[#FAF9F6] border border-stone-200 rounded-lg">
              <p className="text-xs text-stone-500">Lifetime Spend</p>
              <p className="text-xl font-semibold text-stone-900 font-mono-tabular mt-0.5">
                {formatCurrency(guest.lifetimeSpend)}
              </p>
            </div>
            <div className="p-3.5 bg-[#FAF9F6] border border-stone-200 rounded-lg">
              <p className="text-xs text-stone-500">Last Visited</p>
              <p className="text-sm font-semibold text-stone-900 font-mono-tabular mt-1.5">
                {guest.lastVisited}
              </p>
            </div>
          </div>

          {/* Marketing Attributes: Favorite Dish & Celebration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#FAF9F6] border border-stone-200 rounded-xl text-xs">
            <div>
              <span className="text-stone-500 block text-[11px]">Favorite Menu Dish</span>
              <span className="font-semibold text-stone-900">
                {guest.favoriteDish || 'Chef Tasting Selection'}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block text-[11px]">Special Celebration</span>
              <span className="font-semibold text-purple-800">
                {guest.celebrationDate
                  ? `${guest.celebrationType || 'Milestone'}: ${guest.celebrationDate}`
                  : 'No upcoming milestone recorded'}
              </span>
            </div>
          </div>

          {/* Interactive Tag Toggles */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-2">
              Guest Profile Tags (Click to toggle)
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_GUEST_TAGS.map((tag) => {
                const active = guest.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleGuestTag(tag)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {active ? `✓ ${tag}` : tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dietary Restrictions, Allergy Warnings & Personal Notes Form */}
          <form
            onSubmit={handleSaveNotes}
            className="space-y-4 pt-4 border-t border-stone-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">
                Dietary Restrictions, Allergies &amp; Hospitality Notes
              </h3>
              {savedNotice && (
                <span className="text-xs text-emerald-700 font-medium">
                  ✓ Saved to profile
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-stone-500" />
                  <span>Dietary Restrictions</span>
                </label>
                <input
                  type="text"
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-800 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Allergy Warnings</span>
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-amber-50/40 border border-amber-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Personal Notes &amp; Sommelier / Seating Preferences
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Save Hospitality Notes
              </button>
            </div>
          </form>

          {/* Reservation History Log */}
          <div className="space-y-3 pt-4 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">
                Reservation History Log
              </h3>
              <span className="text-xs text-stone-500 font-mono-tabular">
                {reservations.length + guest.history.length} recorded entries
              </span>
            </div>

            <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg overflow-hidden">
              {/* Active / Today / Upcoming Reservations */}
              {reservations.map((res) => (
                <div
                  key={res.id}
                  className="p-3.5 bg-[#FAF9F6] flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-mono-tabular">
                      <span className="font-semibold text-stone-900">
                        {res.date}
                      </span>
                      <span>·</span>
                      <span>{res.time}</span>
                      <span>·</span>
                      <span className="font-semibold text-stone-800">
                        Table {res.tableName}
                      </span>
                    </div>
                    <p className="text-stone-500">
                      {res.shift} Service · {res.partySize} Guests
                      {res.specialRequests ? ` — ${res.specialRequests}` : ''}
                    </p>
                  </div>
                  <span className="font-semibold text-stone-900 shrink-0 ml-2">
                    {res.status}
                  </span>
                </div>
              ))}

              {/* Past Historical Visits */}
              {guest.history.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-white flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-mono-tabular">
                      <span className="font-medium text-stone-900">
                        {item.date}
                      </span>
                      <span>·</span>
                      <span>{item.time}</span>
                      <span>·</span>
                      <span>Table {item.tableName}</span>
                    </div>
                    <p className="text-stone-500">
                      {item.shift} Service · {item.partySize} Guests
                      {item.notes ? ` — ${item.notes}` : ''}
                    </p>
                  </div>
                  <div className="text-right font-mono-tabular shrink-0 ml-2">
                    <div className="font-semibold text-stone-900">
                      {formatCurrency(item.spend)}
                    </div>
                    <div className="text-stone-500">{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
