import React, { useState, useMemo } from 'react';
import {
  RestaurantProfile,
  RestaurantTable,
  GuestProfile,
  GuestFeedback,
  SmartSegmentId,
  CampaignTemplate,
  FeedbackTag,
} from '../types';
import {
  TODAY_DATE,
  INITIAL_CAMPAIGN_TEMPLATES,
} from '../data/seedData';
import { formatCurrency } from '../utils/currency';
import {
  Users,
  Send,
  MessageSquare,
  Star,
  Sparkles,
  AlertTriangle,
  Gift,
  Clock,
  CheckCircle2,
  Copy,
  ExternalLink,
  Search,
  Filter,
  Check,
  Download,
  Calendar,
  Utensils,
  ChevronRight,
  TrendingUp,
  MapPin,
  X,
  Phone,
  RotateCcw,
  UserCheck,
  MessageCircle,
} from 'lucide-react';

interface MarketingRetentionProps {
  restaurant: RestaurantProfile;
  guests: GuestProfile[];
  tables: RestaurantTable[];
  feedbacks: GuestFeedback[];
  onUpdateGuest: (guestId: string, updated: Partial<GuestProfile>) => void;
  onAddFeedback: (feedback: Omit<GuestFeedback, 'id'>) => void;
  onResolveFeedback: (feedbackId: string, resolutionNote: string) => void;
  onNavigateToBooking: (guest?: GuestProfile) => void;
  onSelectGuestForDossier: (guestId: string) => void;
}

export const MarketingRetention: React.FC<MarketingRetentionProps> = ({
  restaurant,
  guests,
  tables,
  feedbacks,
  onUpdateGuest,
  onAddFeedback,
  onResolveFeedback,
  onNavigateToBooking,
  onSelectGuestForDossier,
}) => {
  // Navigation sub-tabs within /marketing
  const [activeSubTab, setActiveSubTab] = useState<'segments' | 'campaign' | 'feedback'>('segments');

  // Selected Smart Segment
  const [selectedSegmentId, setSelectedSegmentId] = useState<SmartSegmentId>('vip_regulars');

  // Search in segments view
  const [segmentSearchQuery, setSegmentSearchQuery] = useState('');

  // WhatsApp Campaign Builder State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-1');
  const [campaignMessageText, setCampaignMessageText] = useState<string>(
    INITIAL_CAMPAIGN_TEMPLATES[0].defaultText
  );
  const [previewGuestIndex, setPreviewGuestIndex] = useState<number>(0);
  const [sentGuestIds, setSentGuestIds] = useState<Set<string>>(new Set());

  // Broadcast Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [copiedExportText, setCopiedExportText] = useState(false);

  // New Feedback Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [newFbGuestId, setNewFbGuestId] = useState<string>('');
  const [newFbTableId, setNewFbTableId] = useState<string>('');
  const [newFbRating, setNewFbRating] = useState<number>(5);
  const [newFbHoverRating, setNewFbHoverRating] = useState<number>(0);
  const [newFbTags, setNewFbTags] = useState<FeedbackTag[]>(['Food Quality', 'Service']);
  const [newFbComment, setNewFbComment] = useState<string>('');
  const [newFbBillAmount, setNewFbBillAmount] = useState<number>(185);

  // Manager Follow-up Resolution Modal State
  const [resolvingFeedback, setResolvingFeedback] = useState<GuestFeedback | null>(null);
  const [resolutionNoteInput, setResolutionNoteInput] = useState<string>('');

  // Filter in feedback tab
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'high' | 'action_required'>('all');

  // Date helper calculations
  const calculateDaysAgo = (dateStr: string) => {
    try {
      const today = new Date(TODAY_DATE).getTime();
      const past = new Date(dateStr).getTime();
      const diffTime = today - past;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 0;
    }
  };

  // 1. SMART GUEST SEGMENT CLASSIFICATION
  const vipRegulars = useMemo(() => {
    return guests.filter((g) => g.totalVisits >= 3 || g.lifetimeSpend >= 2000);
  }, [guests]);

  const lapsedDiners = useMemo(() => {
    return guests.filter((g) => {
      const days = calculateDaysAgo(g.lastVisited);
      return days > 45;
    });
  }, [guests]);

  const upcomingCelebrations = useMemo(() => {
    return guests.filter((g) => {
      if (g.celebrationType) return true;
      if (g.tags.includes('Anniversary')) return true;
      if (g.celebrationDate && g.celebrationDate.toLowerCase().includes('october')) return true;
      return false;
    });
  }, [guests]);

  const newFirstTimers = useMemo(() => {
    return guests.filter((g) => {
      const days = calculateDaysAgo(g.lastVisited);
      return g.totalVisits === 1 && days <= 14;
    });
  }, [guests]);

  // Map of segment arrays
  const segmentGuestsMap: Record<SmartSegmentId, GuestProfile[]> = {
    vip_regulars: vipRegulars,
    lapsed_diners: lapsedDiners,
    upcoming_celebrations: upcomingCelebrations,
    new_first_timers: newFirstTimers,
  };

  const activeSegmentGuests = segmentGuestsMap[selectedSegmentId] || [];

  // Filtered active segment guests
  const filteredActiveSegmentGuests = useMemo(() => {
    if (!segmentSearchQuery.trim()) return activeSegmentGuests;
    const q = segmentSearchQuery.toLowerCase();
    return activeSegmentGuests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        (g.favoriteDish && g.favoriteDish.toLowerCase().includes(q)) ||
        (g.celebrationDate && g.celebrationDate.toLowerCase().includes(q))
    );
  }, [activeSegmentGuests, segmentSearchQuery]);

  // Feedbacks with Action Required
  const actionRequiredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => fb.status === 'action_required' || fb.rating <= 3);
  }, [feedbacks]);

  // Average Rating
  const avgSatisfaction = useMemo(() => {
    if (!feedbacks.length) return 5.0;
    const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    return Number((sum / feedbacks.length).toFixed(1));
  }, [feedbacks]);

  // Handle template selection
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = INITIAL_CAMPAIGN_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setCampaignMessageText(tpl.defaultText);
      setSelectedSegmentId(tpl.targetSegment);
      setPreviewGuestIndex(0);
    }
  };

  // Variable insertion
  const handleInsertVariable = (variable: string) => {
    setCampaignMessageText((prev) => prev + ` {${variable}}`);
  };

  // Resolved dynamic message for a guest
  const resolvePersonalizedMessage = (guest?: GuestProfile) => {
    const targetGuest = guest || activeSegmentGuests[previewGuestIndex] || guests[0];
    const guestFirstName = targetGuest ? targetGuest.name.split(' ')[0] : 'Guest';
    const guestFullName = targetGuest ? targetGuest.name : 'Valued Patron';
    const favoriteDish = targetGuest?.favoriteDish || 'Signature Tasting Course';
    const bookingLink = typeof window !== 'undefined' ? `${window.location.origin}/book` : 'https://maison.hospitality/book';

    return campaignMessageText
      .replace(/{Guest_Name}/g, guestFirstName)
      .replace(/{Guest_Full_Name}/g, guestFullName)
      .replace(/{Restaurant_Name}/g, restaurant.name)
      .replace(/{Favorite_Dish}/g, favoriteDish)
      .replace(/{Booking_Link}/g, bookingLink);
  };

  // Google Maps Review Invite Message
  const getGoogleMapsInviteText = (guest: GuestProfile, rating: number) => {
    const firstName = guest.name.split(' ')[0];
    const reviewLink = 'https://search.google.com/local/writereview?placeid=maison-lumiere';
    return `Bonjour ${firstName}, thank you so much for dining at ${restaurant.name} and sharing your wonderful ${rating}-star feedback with our team! As an independent dining room, reviews on Google Maps mean the world to our kitchen and service brigade. Could you take 30 seconds to share your kind review with fellow diners? ${reviewLink} — Warm regards, The Maison Team`;
  };

  // Submit Feedback
  const handleSubmitNewFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFbGuestId) return;
    const targetGuest = guests.find((g) => g.id === newFbGuestId);
    if (!targetGuest) return;

    const isActionRequired = newFbRating <= 3;

    onAddFeedback({
      guestId: targetGuest.id,
      guestName: targetGuest.name,
      guestPhone: targetGuest.phone,
      rating: newFbRating,
      tags: newFbTags,
      comment: newFbComment || (newFbRating >= 4 ? 'Very pleasant dining experience.' : 'Diner noted areas for service follow-up.'),
      date: TODAY_DATE,
      tableName: newFbTableId || 'T1',
      billAmount: newFbBillAmount,
      status: isActionRequired ? 'action_required' : 'resolved',
      managerFollowUpNote: '',
    });

    if (isActionRequired) {
      onUpdateGuest(targetGuest.id, { needsManagerFollowUp: true });
    }

    setIsFeedbackModalOpen(false);
    setNewFbComment('');
  };

  // Confirm Manager Follow-up Resolution
  const handleConfirmResolution = () => {
    if (!resolvingFeedback) return;
    onResolveFeedback(
      resolvingFeedback.id,
      resolutionNoteInput || 'Manager completed phone call with guest and extended courtesy invite.'
    );
    // Remove flag from guest if no more action required
    onUpdateGuest(resolvingFeedback.guestId, { needsManagerFollowUp: false });
    setResolvingFeedback(null);
    setResolutionNoteInput('');
  };

  // Export broadcast list for WhatsApp Business
  const getBroadcastExportText = () => {
    return activeSegmentGuests
      .map((g) => `${g.name}, ${g.phone}, ${g.favoriteDish || 'Chef Special'}`)
      .join('\n');
  };

  const handleCopyBroadcastList = () => {
    navigator.clipboard?.writeText(getBroadcastExportText()).catch(() => {});
    setCopiedExportText(true);
    setTimeout(() => setCopiedExportText(false), 2000);
  };

  const handleDownloadCsv = () => {
    const headers = 'Name,Phone,Segment,Lifetime Spend,Total Visits,Favorite Dish,Celebration Date\n';
    const rows = activeSegmentGuests
      .map(
        (g) =>
          `"${g.name}","${g.phone}","${selectedSegmentId}","${g.lifetimeSpend}","${g.totalVisits}","${g.favoriteDish || ''}","${g.celebrationDate || ''}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `maison_${selectedSegmentId}_broadcast_list.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentPreviewGuest = activeSegmentGuests[previewGuestIndex] || guests[0];
  const renderedMockupMessage = resolvePersonalizedMessage(currentPreviewGuest);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* 1. TOP HEADER & METRIC SUMMARY */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Retention &amp; Guest Marketing Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-display font-semibold text-stone-900">
              Guest Retention &amp; WhatsApp Marketing
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 max-w-2xl">
              Targeted segment filters, 1-click WhatsApp hospitality campaigns with personalized dish variables, and automated 5-star post-dining review collection.
            </p>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('feedback');
                setIsFeedbackModalOpen(true);
              }}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shadow-2xs"
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>+ Log Guest Feedback</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('campaign');
              }}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>+ Launch WhatsApp Campaign</span>
            </button>
          </div>
        </div>

        {/* Highlight KPI Pills Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-stone-100">
          <div className="p-3.5 bg-[#FAF9F6] border border-stone-200 rounded-xl">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>VIP Regulars</span>
              <Users className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <p className="text-xl font-bold font-mono-tabular text-stone-900 mt-1">
              {vipRegulars.length}{' '}
              <span className="text-xs font-normal text-stone-500 font-sans">
                diners (&ge;$2k or 3+ visits)
              </span>
            </p>
          </div>

          <div className="p-3.5 bg-[#FAF9F6] border border-stone-200 rounded-xl">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>Lapsed Diners (&gt;45 days)</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xl font-bold font-mono-tabular text-amber-700 mt-1">
              {lapsedDiners.length}{' '}
              <span className="text-xs font-normal text-stone-500 font-sans">
                ready for re-engagement
              </span>
            </p>
          </div>

          <div className="p-3.5 bg-[#FAF9F6] border border-stone-200 rounded-xl">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>Upcoming Celebrations</span>
              <Gift className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <p className="text-xl font-bold font-mono-tabular text-purple-700 mt-1">
              {upcomingCelebrations.length}{' '}
              <span className="text-xs font-normal text-stone-500 font-sans">
                this month
              </span>
            </p>
          </div>

          <div className="p-3.5 bg-[#FAF9F6] border border-stone-200 rounded-xl">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>Guest Rating &amp; Action Flags</span>
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold font-mono-tabular text-stone-900">
                {avgSatisfaction} <span className="text-amber-500 text-sm">★</span>
              </span>
              {actionRequiredFeedbacks.length > 0 ? (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold rounded-full animate-pulse">
                  {actionRequiredFeedbacks.length} Flagged
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-medium rounded-full">
                  All Resolved
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION CONTROLS */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-px">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('segments')}
            className={`pb-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeSubTab === 'segments'
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            1. Smart Guest Segments ({guests.length} Profiles)
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('campaign')}
            className={`pb-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 flex items-center gap-1.5 ${
              activeSubTab === 'campaign'
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>2. WhatsApp Campaign Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('feedback')}
            className={`pb-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 flex items-center gap-1.5 ${
              activeSubTab === 'feedback'
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>3. Post-Dining Feedback &amp; Reviews ({feedbacks.length})</span>
            {actionRequiredFeedbacks.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* VIEW 1: SMART GUEST SEGMENTS                         */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'segments' && (
        <div className="space-y-6">
          {/* 4 PRE-BUILT SEGMENT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* SEGMENT 1: VIP REGULARS */}
            <div
              onClick={() => setSelectedSegmentId('vip_regulars')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedSegmentId === 'vip_regulars'
                  ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-stone-900'
                  : 'bg-white border-stone-200 hover:border-stone-400 text-stone-900 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${
                    selectedSegmentId === 'vip_regulars'
                      ? 'bg-stone-800 text-amber-300'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  VIP Regulars
                </span>
                <span className="font-mono-tabular text-sm font-bold">
                  {vipRegulars.length} Diners
                </span>
              </div>
              <h3 className="font-semibold text-sm">3+ Visits or &ge;$2,000 Spend</h3>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  selectedSegmentId === 'vip_regulars'
                    ? 'text-stone-300'
                    : 'text-stone-500'
                }`}
              >
                High-frequency loyal patrons and high-value cellar lovers.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-200/40 flex items-center justify-between text-xs font-mono-tabular">
                <span>Avg Spend:</span>
                <span className="font-bold">
                  $
                  {(
                    vipRegulars.reduce((a, b) => a + b.lifetimeSpend, 0) /
                    (vipRegulars.length || 1)
                  ).toFixed(0)}
                </span>
              </div>
            </div>

            {/* SEGMENT 2: LAPSED DINERS */}
            <div
              onClick={() => setSelectedSegmentId('lapsed_diners')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedSegmentId === 'lapsed_diners'
                  ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-stone-900'
                  : 'bg-white border-stone-200 hover:border-stone-400 text-stone-900 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${
                    selectedSegmentId === 'lapsed_diners'
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Lapsed Diners
                </span>
                <span className="font-mono-tabular text-sm font-bold">
                  {lapsedDiners.length} Diners
                </span>
              </div>
              <h3 className="font-semibold text-sm">No Visit in Last 45 Days</h3>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  selectedSegmentId === 'lapsed_diners'
                    ? 'text-stone-300'
                    : 'text-stone-500'
                }`}
              >
                Previously active diners ripe for a &ldquo;We Miss You&rdquo; dessert incentive.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-200/40 flex items-center justify-between text-xs font-mono-tabular">
                <span>Total Past Visits:</span>
                <span className="font-bold">
                  {lapsedDiners.reduce((a, b) => a + b.totalVisits, 0)} visits
                </span>
              </div>
            </div>

            {/* SEGMENT 3: UPCOMING CELEBRATIONS */}
            <div
              onClick={() => setSelectedSegmentId('upcoming_celebrations')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedSegmentId === 'upcoming_celebrations'
                  ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-stone-900'
                  : 'bg-white border-stone-200 hover:border-stone-400 text-stone-900 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${
                    selectedSegmentId === 'upcoming_celebrations'
                      ? 'bg-purple-950 text-purple-300'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  Celebrations
                </span>
                <span className="font-mono-tabular text-sm font-bold">
                  {upcomingCelebrations.length} Diners
                </span>
              </div>
              <h3 className="font-semibold text-sm">Birthdays &amp; Anniversaries</h3>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  selectedSegmentId === 'upcoming_celebrations'
                    ? 'text-stone-300'
                    : 'text-stone-500'
                }`}
              >
                Special milestones occurring this month for champagne privilege invites.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-200/40 flex items-center justify-between text-xs font-mono-tabular">
                <span>Month:</span>
                <span className="font-bold">October 2026</span>
              </div>
            </div>

            {/* SEGMENT 4: NEW FIRST-TIMERS */}
            <div
              onClick={() => setSelectedSegmentId('new_first_timers')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedSegmentId === 'new_first_timers'
                  ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-stone-900'
                  : 'bg-white border-stone-200 hover:border-stone-400 text-stone-900 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${
                    selectedSegmentId === 'new_first_timers'
                      ? 'bg-emerald-950 text-emerald-300'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  New First-Timers
                </span>
                <span className="font-mono-tabular text-sm font-bold">
                  {newFirstTimers.length} Diners
                </span>
              </div>
              <h3 className="font-semibold text-sm">Visited Once in Last 14 Days</h3>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  selectedSegmentId === 'new_first_timers'
                    ? 'text-stone-300'
                    : 'text-stone-500'
                }`}
              >
                First-time visitors who experienced their initial service this fortnight.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-200/40 flex items-center justify-between text-xs font-mono-tabular">
                <span>Conversion Goal:</span>
                <span className="font-bold">2nd Visit</span>
              </div>
            </div>
          </div>

          {/* ACTIVE SEGMENT ACTION BAR & DINERS TABLE */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 bg-[#FAF9F6] border-b border-stone-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-serif-display font-bold text-stone-900">
                    {selectedSegmentId === 'vip_regulars' && 'VIP Regulars Segment'}
                    {selectedSegmentId === 'lapsed_diners' && 'Lapsed Diners Segment (45+ Days)'}
                    {selectedSegmentId === 'upcoming_celebrations' && 'Upcoming Celebrations (October)'}
                    {selectedSegmentId === 'new_first_timers' && 'New First-Timers (Past 14 Days)'}
                  </h2>
                  <span className="px-2.5 py-0.5 bg-stone-900 text-white rounded-full text-xs font-mono-tabular font-medium">
                    {filteredActiveSegmentGuests.length} matching
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Click any diner to open their WhatsApp dialogue or view their full CRM dossier.
                </p>
              </div>

              {/* Action Buttons: Launch Campaign or Export Broadcast */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={segmentSearchQuery}
                    onChange={(e) => setSegmentSearchQuery(e.target.value)}
                    placeholder="Search in segment..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Broadcast</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Match template
                    if (selectedSegmentId === 'lapsed_diners') {
                      handleSelectTemplate('tpl-1');
                    } else if (selectedSegmentId === 'upcoming_celebrations') {
                      handleSelectTemplate('tpl-2');
                    } else {
                      handleSelectTemplate('tpl-3');
                    }
                    setActiveSubTab('campaign');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Create Campaign for this Segment</span>
                </button>
              </div>
            </div>

            {/* Segment Diners High-Density Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium">
                    <th className="py-3 px-4">Guest Name &amp; Phone</th>
                    <th className="py-3 px-4">Status &amp; Flags</th>
                    <th className="py-3 px-4">Favorite Dish</th>
                    <th className="py-3 px-4">Last Visit</th>
                    <th className="py-3 px-4 text-right">Lifetime Spend</th>
                    <th className="py-3 px-4 text-right">Visits</th>
                    <th className="py-3 px-4 text-right">1-Click Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredActiveSegmentGuests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-500">
                        No guests match this segment search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredActiveSegmentGuests.map((guest) => {
                      const daysAgo = calculateDaysAgo(guest.lastVisited);
                      const cleanPhone = guest.phone.replace(/[^0-9]/g, '');
                      const personalizedMsg = resolvePersonalizedMessage(guest);
                      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                        personalizedMsg
                      )}`;

                      return (
                        <tr
                          key={guest.id}
                          className="hover:bg-[#FAF9F6] transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                              <span>{guest.name}</span>
                              {guest.celebrationDate && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-mono-tabular border border-purple-200">
                                  <Gift className="w-2.5 h-2.5" />
                                  {guest.celebrationType || 'Milestone'}: {guest.celebrationDate}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 font-mono-tabular">
                              {guest.phone}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1">
                              {guest.needsManagerFollowUp && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded font-bold text-[10px] flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-red-600" />
                                  Action Required: Manager Follow-up
                                </span>
                              )}
                              {guest.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[10px]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-stone-800 font-medium flex items-center gap-1">
                              <Utensils className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="truncate max-w-[180px]">
                                {guest.favoriteDish || 'Chef Tasting Selection'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono-tabular">
                            <div className="text-stone-800">{guest.lastVisited}</div>
                            <div className="text-[11px] text-stone-500">
                              {daysAgo === 0
                                ? 'Today'
                                : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-mono-tabular font-bold text-stone-900">
                            {formatCurrency(guest.lifetimeSpend)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono-tabular text-stone-700">
                            {guest.totalVisits}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shadow-2xs"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => onSelectGuestForDossier(guest.id)}
                                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                              >
                                CRM Dossier
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW 2: WHATSAPP CAMPAIGN BUILDER                    */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'campaign' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: CAMPAIGN CONFIGURATOR (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div>
                  <h2 className="text-lg font-serif-display font-bold text-stone-900">
                    WhatsApp Campaign Builder
                  </h2>
                  <p className="text-xs text-stone-500">
                    Compose targeted hospitality broadcasts with automated personalization variables.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-md font-mono-tabular">
                  {activeSegmentGuests.length} Recipients
                </span>
              </div>

              {/* Step A: Select Audience Segment */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Target Audience Segment
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSegmentId('lapsed_diners');
                      handleSelectTemplate('tpl-1');
                    }}
                    className={`p-2.5 rounded-xl border text-xs text-left transition-colors ${
                      selectedSegmentId === 'lapsed_diners'
                        ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                        : 'bg-[#FAF9F6] text-stone-700 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <p className="font-bold">Lapsed Diners</p>
                    <p className="text-[11px] opacity-75">{lapsedDiners.length} diners</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSegmentId('upcoming_celebrations');
                      handleSelectTemplate('tpl-2');
                    }}
                    className={`p-2.5 rounded-xl border text-xs text-left transition-colors ${
                      selectedSegmentId === 'upcoming_celebrations'
                        ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                        : 'bg-[#FAF9F6] text-stone-700 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <p className="font-bold">Celebrations</p>
                    <p className="text-[11px] opacity-75">{upcomingCelebrations.length} diners</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSegmentId('vip_regulars');
                      handleSelectTemplate('tpl-3');
                    }}
                    className={`p-2.5 rounded-xl border text-xs text-left transition-colors ${
                      selectedSegmentId === 'vip_regulars'
                        ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                        : 'bg-[#FAF9F6] text-stone-700 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <p className="font-bold">VIP Regulars</p>
                    <p className="text-[11px] opacity-75">{vipRegulars.length} diners</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSegmentId('new_first_timers');
                    }}
                    className={`p-2.5 rounded-xl border text-xs text-left transition-colors ${
                      selectedSegmentId === 'new_first_timers'
                        ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                        : 'bg-[#FAF9F6] text-stone-700 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <p className="font-bold">First-Timers</p>
                    <p className="text-[11px] opacity-75">{newFirstTimers.length} diners</p>
                  </button>
                </div>
              </div>

              {/* Step B: Choose Targeted Template */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Pre-Written Campaign Templates
                </label>
                <div className="space-y-2">
                  {INITIAL_CAMPAIGN_TEMPLATES.map((tpl) => {
                    const active = selectedTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleSelectTemplate(tpl.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          active
                            ? 'bg-emerald-50/60 border-emerald-600 ring-1 ring-emerald-600'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                            {active && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                            <span>{tpl.name}</span>
                          </h4>
                          <span className="text-[10px] uppercase font-mono-tabular text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                            {tpl.targetSegment.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                          {tpl.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step C: Personalization Variables Toolbar */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Insert Personalization Variables
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Click to insert at end of message
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('Guest_Name')}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-mono-tabular rounded-md border border-stone-300 transition-colors flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>{'{Guest_Name}'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertVariable('Restaurant_Name')}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-mono-tabular rounded-md border border-stone-300 transition-colors flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>{'{Restaurant_Name}'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertVariable('Favorite_Dish')}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-mono-tabular rounded-md border border-stone-300 transition-colors flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>{'{Favorite_Dish}'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsertVariable('Booking_Link')}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-mono-tabular rounded-md border border-stone-300 transition-colors flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>{'{Booking_Link}'}</span>
                  </button>
                </div>
              </div>

              {/* Step D: Textarea Message Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold uppercase tracking-wider text-stone-700">
                    Campaign Broadcast Message
                  </label>
                  <span className="font-mono-tabular text-stone-500">
                    {campaignMessageText.length} characters
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={campaignMessageText}
                  onChange={(e) => setCampaignMessageText(e.target.value)}
                  className="w-full p-3.5 text-xs bg-[#FAF9F6] border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 font-sans leading-relaxed text-stone-900"
                  placeholder="Type your WhatsApp message with variables..."
                />
              </div>

              {/* Audience Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Broadcast List for WhatsApp Business</span>
                </button>

                <div className="text-xs text-stone-500 font-mono-tabular">
                  Sent: {sentGuestIds.size} / {activeSegmentGuests.length} diners
                </div>
              </div>
            </div>

            {/* RECIPIENT DISPATCHER QUEUE */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    Recipient Dispatcher Queue ({activeSegmentGuests.length} Guests)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Click &ldquo;Open in WhatsApp&rdquo; for each diner to launch wa.me with their personalized text.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {activeSegmentGuests.map((guest, idx) => {
                  const cleanPhone = guest.phone.replace(/[^0-9]/g, '');
                  const personalizedMsg = resolvePersonalizedMessage(guest);
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    personalizedMsg
                  )}`;
                  const isSent = sentGuestIds.has(guest.id);

                  return (
                    <div
                      key={guest.id}
                      className="p-3 bg-[#FAF9F6] border border-stone-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900 truncate">
                            {guest.name}
                          </span>
                          <span className="text-stone-400 font-mono-tabular text-[11px]">
                            {guest.phone}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 truncate mt-0.5">
                          Dish: {guest.favoriteDish || 'Chef Special'} · Spent: $
                          {guest.lifetimeSpend}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSent ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1 font-mono-tabular">
                            <Check className="w-3.5 h-3.5" />
                            <span>Sent</span>
                          </span>
                        ) : null}

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setSentGuestIds((prev) => new Set([...prev, guest.id]));
                          }}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shadow-2xs whitespace-nowrap"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Send WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: REALISTIC WHATSAPP CHAT BUBBLE MOCKUP (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Interactive Campaign Preview
              </span>

              {/* Guest Preview Selector */}
              {activeSegmentGuests.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-stone-500">Previewing:</span>
                  <select
                    value={previewGuestIndex}
                    onChange={(e) => setPreviewGuestIndex(Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:outline-none"
                  >
                    {activeSegmentGuests.map((g, idx) => (
                      <option key={g.id} value={idx}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* REALISTIC WHATSAPP PHONE MOCKUP */}
            <div className="bg-stone-900 p-3 sm:p-4 rounded-[2.5rem] shadow-2xl border-4 border-stone-800 max-w-sm mx-auto w-full">
              {/* Phone Speaker Notch */}
              <div className="w-24 h-4 bg-stone-950 rounded-full mx-auto mb-3" />

              {/* WhatsApp App Screen */}
              <div className="bg-[#EFEAE2] rounded-3xl overflow-hidden shadow-inner flex flex-col h-[520px]">
                {/* WhatsApp Top Header Bar */}
                <div className="bg-[#075E54] text-white px-3.5 py-3 flex items-center justify-between shrink-0 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#075E54] font-serif-display font-bold flex items-center justify-center text-sm shadow-xs">
                      M
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-xs leading-none">
                          {restaurant.name}
                        </p>
                        <CheckCircle2 className="w-3 h-3 text-emerald-300 fill-emerald-300" />
                      </div>
                      <p className="text-[10px] text-emerald-200 mt-0.5">
                        Official Hospitality Channel
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-emerald-100 text-xs">
                    <Phone className="w-3.5 h-3.5" />
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Chat Area with WhatsApp Wallpaper Pattern */}
                <div
                  className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col justify-end"
                  style={{
                    backgroundColor: '#E5DDD5',
                    backgroundImage:
                      'radial-gradient(#d3c9bf 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                >
                  {/* Date Badge */}
                  <div className="text-center">
                    <span className="px-2.5 py-0.5 bg-white/80 backdrop-blur-xs text-[10px] font-semibold text-stone-600 rounded-md shadow-2xs font-mono-tabular">
                      TODAY
                    </span>
                  </div>

                  {/* Outgoing WhatsApp Chat Bubble */}
                  <div className="self-end max-w-[90%] bg-[#DCF8C6] text-stone-900 rounded-2xl rounded-tr-xs p-3 shadow-xs text-xs space-y-2 border border-[#C5E9A8]/40">
                    <p className="whitespace-pre-line leading-relaxed text-stone-900">
                      {renderedMockupMessage}
                    </p>

                    {/* Rich Link Preview Card */}
                    <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-200 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900">
                        <Utensils className="w-3 h-3 text-emerald-800" />
                        <span>Reserve a Table at {restaurant.name}</span>
                      </div>
                      <p className="text-stone-500 text-[10px] line-clamp-1">
                        Instant live booking portal with real-time table availability.
                      </p>
                      <p className="text-emerald-800 text-[10px] font-mono-tabular">
                        maison.hospitality/book
                      </p>
                    </div>

                    {/* Timestamp & Double Checkmarks */}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-stone-500 font-mono-tabular pt-0.5">
                      <span>2:45 PM</span>
                      <span className="text-blue-500 font-bold tracking-tighter">
                        &#10003;&#10003;
                      </span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Chat Input Mockup */}
                <div className="bg-[#F0F0F0] p-2 flex items-center gap-2 border-t border-stone-200 shrink-0">
                  <div className="flex-1 bg-white px-3 py-1.5 rounded-full text-xs text-stone-400">
                    Type a message...
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#128C7E] text-white flex items-center justify-center shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick 1-Click Launch Action for Previewed Guest */}
            {currentPreviewGuest && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-950">
                    Test Send to {currentPreviewGuest.name}
                  </span>
                  <span className="font-mono-tabular text-emerald-800">
                    {currentPreviewGuest.phone}
                  </span>
                </div>
                <a
                  href={`https://wa.me/${currentPreviewGuest.phone.replace(
                    /[^0-9]/g,
                    ''
                  )}?text=${encodeURIComponent(renderedMockupMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Launch WhatsApp Web / App</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW 3: AUTOMATED POST-DINING FEEDBACK               */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'feedback' && (
        <div className="space-y-6">
          {/* ACTION REQUIRED BANNER IF LOW RATINGS DETECTED */}
          {actionRequiredFeedbacks.length > 0 && (
            <div className="bg-red-50/80 border-2 border-red-300 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 text-red-700 rounded-xl mt-0.5 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-red-950 flex items-center gap-2">
                      <span>Action Required: Manager Follow-up Flagged</span>
                      <span className="px-2 py-0.5 bg-red-200 text-red-900 rounded-full text-xs font-mono-tabular">
                        {actionRequiredFeedbacks.length} guest{actionRequiredFeedbacks.length > 1 ? 's' : ''}
                      </span>
                    </h3>
                    <p className="text-xs text-red-800 mt-1">
                      Low feedback ratings (&le;3 stars) automatically alert the management team for service recovery and personal outreach.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFeedbackFilter('action_required')}
                  className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 shadow-2xs"
                >
                  View Flagged Reviews
                </button>
              </div>
            </div>
          )}

          {/* FEEDBACK METRICS OVERVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Score */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Hospitality Satisfaction Index
                </p>
                <div className="flex items-baseline gap-3 mt-3">
                  <span className="text-4xl font-serif-display font-bold text-stone-900">
                    {avgSatisfaction}
                  </span>
                  <div className="flex items-center text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(avgSatisfaction)
                            ? 'fill-amber-500'
                            : 'text-stone-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Based on {feedbacks.length} recent table dining experiences
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                <span>Google Review Recommendation:</span>
                <span className="font-semibold text-emerald-800">
                  {Math.round(
                    (feedbacks.filter((f) => f.rating >= 4).length / (feedbacks.length || 1)) * 100
                  )}
                  % Qualified
                </span>
              </div>
            </div>

            {/* Rating Breakdown Bars */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Star Rating Breakdown
              </p>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = feedbacks.filter((f) => f.rating === stars).length;
                const pct = Math.round((count / (feedbacks.length || 1)) * 100);
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs font-mono-tabular">
                    <span className="w-12 text-stone-600 flex items-center gap-1">
                      <span>{stars}</span>
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    </span>
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          stars >= 4
                            ? 'bg-emerald-600'
                            : stars === 3
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-stone-500">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Dimension Breakdown */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                Guest Dimension Tags
              </p>
              {(['Food Quality', 'Service', 'Ambience', 'Value'] as FeedbackTag[]).map((tag) => {
                const count = feedbacks.filter((f) => f.tags.includes(tag)).length;
                return (
                  <div
                    key={tag}
                    className="p-2.5 bg-[#FAF9F6] border border-stone-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-stone-800">{tag}</span>
                    <span className="font-mono-tabular text-stone-600">
                      {count} mention{count === 1 ? '' : 's'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FEEDBACK FEED & CONTROLS */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 bg-[#FAF9F6] border-b border-stone-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Filter Feed:
                </span>
                <div className="inline-flex items-center p-1 bg-stone-200/60 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setFeedbackFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      feedbackFilter === 'all'
                        ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    All ({feedbacks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackFilter('high')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      feedbackFilter === 'high'
                        ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    4–5 ★ High ({feedbacks.filter((f) => f.rating >= 4).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackFilter('action_required')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      feedbackFilter === 'action_required'
                        ? 'bg-red-700 text-white shadow-2xs font-semibold'
                        : 'text-red-700 hover:text-red-900'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Action Required ({actionRequiredFeedbacks.length})</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(true)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-2xs"
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>+ Log New Post-Dining Feedback</span>
              </button>
            </div>

            {/* Feedbacks Grid */}
            <div className="divide-y divide-stone-100">
              {feedbacks
                .filter((fb) => {
                  if (feedbackFilter === 'high') return fb.rating >= 4;
                  if (feedbackFilter === 'action_required')
                    return fb.status === 'action_required' || fb.rating <= 3;
                  return true;
                })
                .map((fb) => {
                  const targetGuest = guests.find((g) => g.id === fb.guestId);
                  const isActionRequired = fb.status === 'action_required' || fb.rating <= 3;
                  const isHighRating = fb.rating >= 4;
                  const googleMapsInviteText = targetGuest
                    ? getGoogleMapsInviteText(targetGuest, fb.rating)
                    : '';
                  const cleanPhone = (targetGuest?.phone || fb.guestPhone).replace(
                    /[^0-9]/g,
                    ''
                  );
                  const googleInviteWaUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    googleMapsInviteText
                  )}`;

                  return (
                    <div
                      key={fb.id}
                      className="p-6 hover:bg-[#FAF9F6] transition-colors space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-stone-900 text-sm">
                              {fb.guestName}
                            </span>
                            <span className="text-xs text-stone-500 font-mono-tabular">
                              {fb.guestPhone}
                            </span>
                            <span className="text-stone-300">•</span>
                            <span className="text-xs text-stone-500 font-mono-tabular">
                              Table {fb.tableName || 'T1'}
                            </span>
                            <span className="text-stone-300">•</span>
                            <span className="text-xs text-stone-500 font-mono-tabular">
                              {fb.date}
                            </span>
                          </div>

                          {/* Star Display */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center text-amber-500">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= fb.rating
                                      ? 'fill-amber-500'
                                      : 'text-stone-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-mono-tabular font-bold text-xs text-stone-900">
                              {fb.rating}.0 / 5.0
                            </span>

                            {/* Tags */}
                            <div className="flex items-center gap-1 ml-2">
                              {fb.tags.map((t) => (
                                <span
                                  key={t}
                                  className="px-2 py-0.5 bg-stone-100 text-stone-700 text-[10px] rounded-md font-medium"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Status Badges & Priority Actions */}
                        <div className="flex items-center gap-2">
                          {isActionRequired ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                <span>Action Required: Manager Follow-up</span>
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  setResolvingFeedback(fb);
                                  setResolutionNoteInput(fb.managerFollowUpNote || '');
                                }}
                                className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs whitespace-nowrap"
                              >
                                Resolve Follow-up
                              </button>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-1 font-mono-tabular">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Resolved</span>
                            </span>
                          )}

                          {/* HIGH RATING ACTION: INVITE TO REVIEW ON GOOGLE MAPS */}
                          {isHighRating && (
                            <a
                              href={googleInviteWaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs whitespace-nowrap"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Invite to Review on Google Maps</span>
                              <ExternalLink className="w-3 h-3 opacity-80" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Comment text */}
                      {fb.comment && (
                        <p className="text-xs text-stone-700 bg-white p-3 rounded-xl border border-stone-200/80 leading-relaxed italic">
                          &ldquo;{fb.comment}&rdquo;
                        </p>
                      )}

                      {/* Manager follow up notes if resolved */}
                      {fb.managerFollowUpNote && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Manager Follow-Up Resolution: </span>
                            <span>{fb.managerFollowUpNote}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: EXPORT BROADCAST LIST                       */}
      {/* ---------------------------------------------------- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Export Broadcast List for WhatsApp Business
                </h3>
                <p className="text-xs text-stone-500">
                  {activeSegmentGuests.length} Diners in {selectedSegmentId.replace('_', ' ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Formatted Recipient Phone List (Name, Mobile, Favorite Dish)
              </label>
              <textarea
                readOnly
                rows={8}
                value={getBroadcastExportText()}
                className="w-full p-3 text-xs bg-stone-50 border border-stone-300 rounded-xl font-mono-tabular text-stone-800"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .CSV Spreadsheet</span>
              </button>

              <button
                type="button"
                onClick={handleCopyBroadcastList}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                {copiedExportText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All Phone Numbers</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: LOG NEW GUEST FEEDBACK                      */}
      {/* ---------------------------------------------------- */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Log Guest Dining Feedback
                </h3>
                <p className="text-xs text-stone-500">
                  Collect 5-star ratings with dimension tags and automated manager alerts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewFeedback} className="space-y-4">
              {/* Guest Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Select Diner</label>
                <select
                  required
                  value={newFbGuestId}
                  onChange={(e) => setNewFbGuestId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                >
                  <option value="">Choose a guest from CRM...</option>
                  {guests.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} — {g.phone} ({g.tags.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Table Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">Table Dined</label>
                  <select
                    value={newFbTableId}
                    onChange={(e) => setNewFbTableId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-xl text-stone-900 focus:outline-none"
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={t.name}>
                        Table {t.name} ({t.zone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">Bill Amount ($)</label>
                  <input
                    type="number"
                    value={newFbBillAmount}
                    onChange={(e) => setNewFbBillAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-stone-300 rounded-xl font-mono-tabular"
                  />
                </div>
              </div>

              {/* 5-Star Interactive Rating */}
              <div className="space-y-2 py-2">
                <label className="text-xs font-bold text-stone-700">
                  Guest Overall Rating ({newFbRating} of 5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setNewFbHoverRating(star)}
                      onMouseLeave={() => setNewFbHoverRating(0)}
                      onClick={() => setNewFbRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= (newFbHoverRating || newFbRating)
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* Rating hint */}
                {newFbRating >= 4 ? (
                  <p className="text-[11px] text-emerald-800 font-medium">
                    ★ High Rating (4–5): Unlocks 1-click &ldquo;Invite to Review on Google Maps&rdquo; WhatsApp invitation.
                  </p>
                ) : (
                  <p className="text-[11px] text-red-700 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Low Rating (1–3): Will automatically flag guest card with &ldquo;Action Required: Manager Follow-up&rdquo;.</span>
                  </p>
                )}
              </div>

              {/* Quick Tags Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">
                  Feedback Dimension Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['Ambience', 'Food Quality', 'Service', 'Value'] as FeedbackTag[]).map((tag) => {
                    const active = newFbTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setNewFbTags((prev) =>
                            active ? prev.filter((t) => t !== tag) : [...prev, tag]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-[#FAF9F6] text-stone-700 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comments Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">
                  Customer Comments &amp; Service Remarks
                </label>
                <textarea
                  rows={3}
                  value={newFbComment}
                  onChange={(e) => setNewFbComment(e.target.value)}
                  placeholder="e.g. Loved the duck confit, commended sommelier on pairings..."
                  className="w-full p-3 text-xs bg-[#FAF9F6] border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="px-4 py-2.5 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  Save Feedback &amp; Update CRM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: RESOLVE MANAGER FOLLOW-UP                   */}
      {/* ---------------------------------------------------- */}
      {resolvingFeedback && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Resolve Manager Follow-Up
                </h3>
                <p className="text-xs text-stone-500">
                  Guest: {resolvingFeedback.guestName} ({resolvingFeedback.guestPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResolvingFeedback(null)}
                className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-red-950">
                Original {resolvingFeedback.rating}-Star Feedback ({resolvingFeedback.date}):
              </p>
              <p className="italic text-red-900">&ldquo;{resolvingFeedback.comment}&rdquo;</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700">
                Resolution Action &amp; Manager Follow-Up Notes
              </label>
              <textarea
                rows={4}
                value={resolutionNoteInput}
                onChange={(e) => setResolutionNoteInput(e.target.value)}
                placeholder="e.g. Spoke directly with guest by telephone; extended complimentary dessert tasting for their upcoming table reservation..."
                className="w-full p-3 text-xs bg-[#FAF9F6] border border-stone-300 rounded-xl text-stone-900"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setResolvingFeedback(null)}
                className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolution}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs"
              >
                <Check className="w-4 h-4" />
                <span>Mark Follow-Up Resolved &amp; Clear Flag</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
