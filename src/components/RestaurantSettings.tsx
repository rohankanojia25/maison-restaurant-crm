import React, { useState } from 'react';
import {
  RestaurantProfile,
  StaffAccount,
  StaffRole,
} from '../types';
import {
  Store,
  Upload,
  Image as ImageIcon,
  Clock,
  Percent,
  Users,
  Shield,
  KeyRound,
  Check,
  Plus,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  Save,
  Phone,
  MapPin,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface RestaurantSettingsProps {
  restaurant: RestaurantProfile;
  onUpdateRestaurant: (updated: Partial<RestaurantProfile>) => void;
}

export const RestaurantSettings: React.FC<RestaurantSettingsProps> = ({
  restaurant,
  onUpdateRestaurant,
}) => {
  // Tab within settings
  const [activeTab, setActiveTab] = useState<'details' | 'service' | 'tax' | 'staff'>('details');

  // Local state for restaurant details
  const [name, setName] = useState(restaurant.name || '');
  const [cuisine, setCuisine] = useState(restaurant.cuisine || '');
  const [city, setCity] = useState(restaurant.city || 'Delhi NCR');
  const [stateName, setStateName] = useState(restaurant.state || 'Delhi NCR');
  const [phone, setPhone] = useState(restaurant.phone || '+91 98110 55019');
  const [address, setAddress] = useState(restaurant.address || '84, The Lodhi, Lodhi Road, New Delhi, Delhi 110003');
  const [logoUrl, setLogoUrl] = useState(restaurant.logoUrl || '');
  const [currencySymbol, setCurrencySymbol] = useState(restaurant.currencySymbol || '₹');
  const [gstin, setGstin] = useState(restaurant.gstin || '07AAAAA0000A1Z5');
  const [fssaiNumber, setFssaiNumber] = useState(restaurant.fssaiNumber || '10019011000123');
  const [upiId, setUpiId] = useState(restaurant.upiId || 'maison.lumiere@okhdfcbank');

  // Service Hours & Table Rules
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(restaurant.slotDurationMinutes || 90);
  const [bufferMinutes, setBufferMinutes] = useState(restaurant.bufferMinutes || 15);
  const [lunchStart, setLunchStart] = useState(restaurant.lunchStart || '12:00 PM');
  const [lunchEnd, setLunchEnd] = useState(restaurant.lunchEnd || '4:00 PM');
  const [dinnerStart, setDinnerStart] = useState(restaurant.dinnerStart || '7:00 PM');
  const [dinnerEnd, setDinnerEnd] = useState(restaurant.dinnerEnd || '11:30 PM');

  // Tax & Surcharge
  const [taxPercentage, setTaxPercentage] = useState<number>(
    restaurant.taxRate !== undefined ? Math.round(restaurant.taxRate * 100) : 5
  );
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(
    restaurant.serviceChargeEnabled ?? true
  );
  const [serviceChargePercentage, setServiceChargePercentage] = useState<number>(
    restaurant.serviceChargeRate !== undefined ? Math.round(restaurant.serviceChargeRate * 100) : 5
  );

  // Staff & PIN Access
  const [pinProtectionEnabled, setPinProtectionEnabled] = useState(
    restaurant.pinProtectionEnabled ?? true
  );
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(
    restaurant.staffAccounts && restaurant.staffAccounts.length > 0
      ? restaurant.staffAccounts
      : [
          {
            id: 'staff-1',
            name: 'Julian Vance',
            role: 'Owner',
            pin: '1234',
            active: true,
            phone: '+1 (212) 555-0101',
          },
          {
            id: 'staff-2',
            name: 'Marcus Bell',
            role: 'Floor Manager',
            pin: '5678',
            active: true,
            phone: '+1 (212) 555-0102',
          },
          {
            id: 'staff-3',
            name: 'Sophie Lin',
            role: 'Host',
            pin: '2468',
            active: true,
            phone: '+1 (212) 555-0103',
          },
          {
            id: 'staff-4',
            name: 'Antoine Dupuis',
            role: 'Server',
            pin: '1357',
            active: true,
            phone: '+1 (212) 555-0104',
          },
        ]
  );

  // New staff modal state
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('Server');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('+91 ');

  // PIN test pad
  const [testPinInput, setTestPinInput] = useState('');
  const [testPinResult, setTestPinResult] = useState<{
    success: boolean;
    staffName?: string;
    role?: string;
  } | null>(null);

  // Save feedback state
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveAll = () => {
    onUpdateRestaurant({
      name,
      cuisine,
      city,
      state: stateName,
      phone,
      address,
      logoUrl,
      currencySymbol,
      gstin: gstin.toUpperCase(),
      fssaiNumber,
      upiId,
      slotDurationMinutes,
      bufferMinutes,
      lunchStart,
      lunchEnd,
      dinnerStart,
      dinnerEnd,
      taxRate: taxPercentage / 100,
      serviceChargeEnabled,
      serviceChargeRate: serviceChargePercentage / 100,
      pinProtectionEnabled,
      staffAccounts,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || newStaffPin.length < 4) return;

    const newStaff: StaffAccount = {
      id: `staff-${Date.now()}`,
      name: newStaffName.trim(),
      role: newStaffRole,
      pin: newStaffPin.slice(0, 4),
      active: true,
      phone: newStaffPhone.trim() || undefined,
    };

    const updated = [...staffAccounts, newStaff];
    setStaffAccounts(updated);
    onUpdateRestaurant({ staffAccounts: updated });

    setNewStaffName('');
    setNewStaffPin('');
    setNewStaffPhone('');
    setIsAddStaffOpen(false);
  };

  const handleToggleStaffActive = (id: string) => {
    const updated = staffAccounts.map((s) =>
      s.id === id ? { ...s, active: !s.active } : s
    );
    setStaffAccounts(updated);
    onUpdateRestaurant({ staffAccounts: updated });
  };

  const handleDeleteStaff = (id: string) => {
    if (staffAccounts.length <= 1) {
      alert('At least one staff member must remain configured.');
      return;
    }
    const updated = staffAccounts.filter((s) => s.id !== id);
    setStaffAccounts(updated);
    onUpdateRestaurant({ staffAccounts: updated });
  };

  const handleTestPin = () => {
    const matched = staffAccounts.find((s) => s.pin === testPinInput && s.active);
    if (matched) {
      setTestPinResult({
        success: true,
        staffName: matched.name,
        role: matched.role,
      });
    } else {
      setTestPinResult({
        success: false,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
            <span>Administration &amp; Operations</span>
            <span>•</span>
            <span className="text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
              Live Config
            </span>
          </div>
          <h1 className="text-2xl font-bold font-serif-display text-stone-900 mt-1">
            Restaurant Settings
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Configure restaurant identity, dining turn durations, GST tax rates, and staff PIN access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-300 flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Settings Saved Successfully!</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all hover:scale-[1.01]"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Save All Changes</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'details'
              ? 'border-stone-900 text-stone-900 bg-white shadow-xs'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Restaurant Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('service')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'service'
              ? 'border-stone-900 text-stone-900 bg-white shadow-xs'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Service Hours &amp; Table Rules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tax')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'tax'
              ? 'border-stone-900 text-stone-900 bg-white shadow-xs'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Tax &amp; Service Charge</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'staff'
              ? 'border-stone-900 text-stone-900 bg-white shadow-xs'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff Accounts &amp; PIN</span>
        </button>
      </div>

      {/* TAB CONTENT 1: RESTAURANT DETAILS */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
              General Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maison Lumière"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Cuisine Concept
                </label>
                <input
                  type="text"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  placeholder="e.g. Contemporary French &amp; Raw Bar"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                />
              </div>

              {/* City & State Presets */}
              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    City &amp; Region Preset
                  </label>
                  <span className="text-[11px] text-stone-500 font-medium">India Metros</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { c: 'Delhi NCR', s: 'Delhi NCR' },
                    { c: 'Mumbai', s: 'Maharashtra' },
                    { c: 'Bengaluru', s: 'Karnataka' },
                    { c: 'Goa', s: 'Goa' },
                    { c: 'Hyderabad', s: 'Telangana' },
                    { c: 'Kolkata', s: 'West Bengal' },
                    { c: 'Chennai', s: 'Tamil Nadu' },
                    { c: 'Pune', s: 'Maharashtra' },
                    { c: 'Jaipur', s: 'Rajasthan' },
                  ].map((preset) => (
                    <button
                      key={preset.c}
                      type="button"
                      onClick={() => {
                        setCity(preset.c);
                        setStateName(preset.s);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                        city === preset.c
                          ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {preset.c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Delhi NCR"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  State / Union Territory
                </label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="e.g. Delhi NCR"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Official Phone / WhatsApp (+91)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98110 55019"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white font-mono-tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Currency Symbol
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {['₹', '$', '€', '£', 'AED'].map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setCurrencySymbol(cur)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        currencySymbol === cur
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 84, The Lodhi, Lodhi Road, New Delhi, Delhi 110003"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                />
              </div>
            </div>

            {/* Indian Statutory Compliance: GSTIN & FSSAI & UPI */}
            <div className="pt-4 border-t border-stone-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Indian Statutory Compliance &amp; UPI
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Mandatory details displayed on digital receipts, tax invoices, and Z-reports
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  GST &amp; FSSAI Compliant
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    GSTIN (15 Alphanumeric) *
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="07AAAAA0000A1Z5"
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 font-mono font-bold focus:outline-none focus:border-stone-900 uppercase"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    {gstin.length}/15 chars
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    FSSAI License # (14 Digits) *
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={fssaiNumber}
                    onChange={(e) => setFssaiNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="10019011000123"
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 font-mono font-bold focus:outline-none focus:border-stone-900"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    {fssaiNumber.length}/14 digits
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Merchant UPI ID (VPA) *
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value.trim().toLowerCase())}
                    placeholder="maison.lumiere@okhdfcbank"
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 font-mono focus:outline-none focus:border-stone-900"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    Used for dynamic bill QR code
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Logo presets */}
            <div className="pt-3 border-t border-stone-100">
              <label className="block text-xs font-medium text-stone-700 mb-2">
                Brand Emblem / Preset Logos
              </label>
              <div className="flex items-center gap-3">
                {[
                  {
                    name: 'Parisian Bistro Crest',
                    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80',
                  },
                  {
                    name: 'Modern Atelier',
                    url: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=200&auto=format&fit=crop&q=80',
                  },
                  {
                    name: 'Courtyard Botanic',
                    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
                  },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setLogoUrl(preset.url)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-xs transition-all ${
                      logoUrl === preset.url
                        ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-8 h-8 rounded-md object-cover"
                    />
                    <span className="text-[11px] font-medium text-stone-800">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right 1 Col: Logo Uploader Card */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-900 mb-1">Restaurant Logo</h2>
              <p className="text-xs text-stone-500">
                Displayed on the customer booking portal (`/book`) and digital receipts.
              </p>

              <div className="mt-4 flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 rounded-xl bg-[#FAF9F6] text-center space-y-3">
                {logoUrl ? (
                  <div className="relative group">
                    <img
                      src={logoUrl}
                      alt="Restaurant Logo"
                      className="w-24 h-24 rounded-xl object-cover border border-stone-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute -top-2 -right-2 p-1 bg-white border border-stone-300 rounded-full text-stone-500 hover:text-red-600 shadow-xs"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-stone-200 flex items-center justify-center text-stone-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="logo-file-upload"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 hover:bg-stone-50 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Custom Logo</span>
                  </label>
                  <input
                    id="logo-file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">PNG, JPG, or SVG up to 2MB</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-[11px] text-stone-600">
              Preview updates instantly across the Guest Portal and Z-Report slip.
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: SERVICE HOURS & TABLE RULES */}
      {activeTab === 'service' && (
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-sm font-bold text-stone-900">
              Seating Pacing &amp; Table Turn Durations
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Governs capacity slot availability on `/book` and table turnover on the Live Floor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Slot Duration */}
            <div className="p-4 bg-[#FAF9F6] rounded-xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900">
                    Default Dining Slot Duration
                  </span>
                  <p className="text-[11px] text-stone-500">
                    Expected time diners spend per seating
                  </p>
                </div>
                <span className="text-base font-bold text-stone-900 font-mono-tabular">
                  {slotDurationMinutes} mins
                </span>
              </div>

              <div className="flex items-center gap-2">
                {[60, 75, 90, 105, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSlotDurationMinutes(mins)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      slotDurationMinutes === mins
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Buffer Time */}
            <div className="p-4 bg-[#FAF9F6] rounded-xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900">
                    Buffer Time Between Seatings
                  </span>
                  <p className="text-[11px] text-stone-500">
                    Table busing, sanitization, and relay window
                  </p>
                </div>
                <span className="text-base font-bold text-stone-900 font-mono-tabular">
                  {bufferMinutes} mins
                </span>
              </div>

              <div className="flex items-center gap-2">
                {[0, 10, 15, 20, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setBufferMinutes(mins)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      bufferMinutes === mins
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Service Hours */}
          <div className="pt-4 border-t border-stone-100 space-y-4">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Service Operating Windows
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-3">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Lunch Shift Window</span>
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">First Seating</label>
                    <input
                      type="text"
                      value={lunchStart}
                      onChange={(e) => setLunchStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">Last Seating</label>
                    <input
                      type="text"
                      value={lunchEnd}
                      onChange={(e) => setLunchEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-3">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span>Dinner Shift Window</span>
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">First Seating</label>
                    <input
                      type="text"
                      value={dinnerStart}
                      onChange={(e) => setDinnerStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-500 mb-1">Last Seating</label>
                    <input
                      type="text"
                      value={dinnerEnd}
                      onChange={(e) => setDinnerEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: TAX & SERVICE CHARGE */}
      {activeTab === 'tax' && (
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-sm font-bold text-stone-900">Tax &amp; Service Charge Policy</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              These percentages are automatically calculated during table bill settlements and on the
              printable Z-report.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Tax Percentage */}
            <div className="p-5 bg-[#FAF9F6] rounded-xl border border-stone-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900">Custom Tax Rate (GST)</span>
                  <p className="text-[11px] text-stone-500">Configured tax charged on food and beverage</p>
                </div>
                <span className="text-lg font-bold text-stone-900 font-mono-tabular">
                  {taxPercentage}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                {[0, 5, 12, 18, 28].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTaxPercentage(pct)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      taxPercentage === pct
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {pct}% {pct === 5 ? '(Std)' : pct === 18 ? '(Liquor)' : ''}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-stone-500">Custom Rate:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(Number(e.target.value))}
                  className="w-20 px-2.5 py-1 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none"
                />
                <span className="text-xs text-stone-600">%</span>
              </div>
            </div>

            {/* Service Charge Toggle & Percentage */}
            <div className="p-5 bg-[#FAF9F6] rounded-xl border border-stone-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900">Service Charge Surcharge</span>
                  <p className="text-[11px] text-stone-500">
                    Discretionary hospitality gratuity distributed to staff
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setServiceChargeEnabled(!serviceChargeEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    serviceChargeEnabled ? 'bg-stone-900' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      serviceChargeEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {serviceChargeEnabled ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    {[5, 8, 10, 12].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setServiceChargePercentage(pct)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          serviceChargePercentage === pct
                            ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Active: {serviceChargePercentage}% service charge applies to dine-in orders.
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-stone-500 italic pt-2">
                  Service charge disabled. Only GST tax will apply to receipts.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: STAFF ACCOUNTS & PIN ACCESS */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* PIN Protection Master Toggle */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">Staff PIN Protection Switch</h3>
                <p className="text-xs text-stone-500">
                  When enabled, voids, discounts, and bill settlements require entering an active staff
                  PIN.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextState = !pinProtectionEnabled;
                setPinProtectionEnabled(nextState);
                onUpdateRestaurant({ pinProtectionEnabled: nextState });
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                pinProtectionEnabled ? 'bg-stone-900' : 'bg-stone-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  pinProtectionEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Staff Accounts List (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Configured Staff Accounts</h3>
                  <p className="text-[11px] text-stone-500">
                    Role-based accounts with individual 4-digit security PINs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(true)}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Staff Member</span>
                </button>
              </div>

              <div className="divide-y divide-stone-100">
                {staffAccounts.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-4 flex items-center justify-between hover:bg-stone-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-xs text-stone-800">
                        {staff.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">{staff.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              staff.role === 'Owner'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : staff.role === 'Floor Manager'
                                ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                : staff.role === 'Host'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : 'bg-stone-100 text-stone-800 border-stone-200'
                            }`}
                          >
                            {staff.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                          <span>PIN: •••• ({staff.pin})</span>
                          {staff.phone && <span>• {staff.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStaffActive(staff.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                          staff.active
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                        }`}
                      >
                        {staff.active ? 'Active' : 'Disabled'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(staff.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-md transition-colors"
                        title="Delete staff account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Quick PIN Test Pad */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-stone-700" />
                  <span>PIN Access Verification Test</span>
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Simulates staff PIN authorization used during checkout or voids.
                </p>
              </div>

              {/* Pin Display */}
              <div className="bg-[#FAF9F6] border border-stone-300 rounded-xl p-3 text-center">
                <span className="text-xs text-stone-400 block mb-1">Enter 4-Digit PIN:</span>
                <span className="text-xl font-mono font-bold tracking-widest text-stone-900">
                  {testPinInput.padEnd(4, '•')}
                </span>
              </div>

              {/* 3x4 Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '✓'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'C') {
                        setTestPinInput('');
                        setTestPinResult(null);
                      } else if (key === '✓') {
                        handleTestPin();
                      } else if (testPinInput.length < 4) {
                        const next = testPinInput + key;
                        setTestPinInput(next);
                        if (next.length === 4) {
                          const matched = staffAccounts.find(
                            (s) => s.pin === next && s.active
                          );
                          if (matched) {
                            setTestPinResult({
                              success: true,
                              staffName: matched.name,
                              role: matched.role,
                            });
                          } else {
                            setTestPinResult({ success: false });
                          }
                        }
                      }
                    }}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      key === '✓'
                        ? 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'
                        : key === 'C'
                        ? 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                        : 'bg-white text-stone-900 border-stone-200 hover:bg-stone-50 active:scale-95'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Test Result Message */}
              {testPinResult && (
                <div
                  className={`p-3 rounded-lg border text-xs font-medium ${
                    testPinResult.success
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-red-50 text-red-900 border-red-300'
                  }`}
                >
                  {testPinResult.success ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <strong>Authorized:</strong> {testPinResult.staffName} ({testPinResult.role})
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Invalid PIN. Access Denied.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="text-base font-bold text-stone-900">Add Staff Account</h3>

            <form onSubmit={handleAddStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Marc Dubois"
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900"
                >
                  <option value="Owner">Owner</option>
                  <option value="Floor Manager">Floor Manager</option>
                  <option value="Host">Host</option>
                  <option value="Server">Server</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  4-Digit Security PIN
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 7890"
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 font-mono tracking-widest focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Contact Phone (Optional)
                </label>
                <input
                  type="text"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  placeholder="+1 (212) 555-0199"
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-3.5 py-2 text-stone-600 hover:text-stone-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newStaffName.trim() || newStaffPin.length < 4}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
