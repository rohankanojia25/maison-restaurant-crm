import React, { useState, useRef } from 'react';
import { MenuItem, MenuCategory, DietaryType } from '../types';
import {
  ExtractedMenuItemDraft,
  DIGITIZER_CATEGORIES,
  SAMPLE_MENU_PRESETS,
  autoDetectDietaryType,
  cleanNumericPrice,
  createDraftItemsFromList,
} from '../utils/menuDigitizer';
import { formatCurrency } from '../utils/currency';
import {
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Check,
  X,
  Plus,
  Trash2,
  SlidersHorizontal,
  Layers,
  Wand2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface AiMenuDigitizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  onConfirmImportItems: (
    items: Array<Omit<MenuItem, 'id' | 'restaurantId'>>
  ) => void;
}

type DigitizerStep = 'upload' | 'extracting' | 'review';

const EXTRACTION_STAGES = [
  {
    step: 1,
    title: 'Scanning layout...',
    detail: 'Detecting multi-column menu blocks, headers & typography',
  },
  {
    step: 2,
    title: 'Detecting categories...',
    detail: 'Grouping Appetizers, Tandoor, Curries, Biryani, Breads, Beverages & Desserts',
  },
  {
    step: 3,
    title: 'Extracting prices & diet tags...',
    detail: 'Parsing ₹ INR rates & auto-classifying Veg (paneer, dal, sabzi) vs. Non-Veg (chicken, mutton, fish, prawn, egg)',
  },
];

export const AiMenuDigitizerModal: React.FC<AiMenuDigitizerModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  onConfirmImportItems,
}) => {
  const [step, setStep] = useState<DigitizerStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(12);

  // Uploaded file or preset metadata
  const [sourceMeta, setSourceMeta] = useState<{
    fileName: string;
    fileTypeLabel: string;
    previewImageUrl?: string;
    presetId?: 'north_indian' | 'cafe_beverage';
  } | null>(null);

  // Extracted editable items
  const [draftItems, setDraftItems] = useState<ExtractedMenuItemDraft[]>([]);

  // Category quick-organizer filter
  const [organizerCategory, setOrganizerCategory] = useState<string>('All');

  // Bulk Edit Toolbar state
  const [isBulkEditOpen, setIsBulkEditOpen] = useState<boolean>(false);
  const [bulkCategory, setBulkCategory] = useState<MenuCategory>('Curries');
  const [bulkDietary, setBulkDietary] = useState<DietaryType>('Veg');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setStep('upload');
    setSourceMeta(null);
    setDraftItems([]);
    setOrganizerCategory('All');
    setIsBulkEditOpen(false);
    onClose();
  };

  const handleDiscard = () => {
    setStep('upload');
    setSourceMeta(null);
    setDraftItems([]);
    setOrganizerCategory('All');
    setIsBulkEditOpen(false);
  };

  // Run the animated 3-stage AI extraction sequence and populate review table
  const runExtractionPipeline = async (options: {
    fileName: string;
    fileTypeLabel: string;
    previewImageUrl?: string;
    base64Data?: string;
    mimeType?: string;
    presetId?: 'north_indian' | 'cafe_beverage';
  }) => {
    setSourceMeta({
      fileName: options.fileName,
      fileTypeLabel: options.fileTypeLabel,
      previewImageUrl: options.previewImageUrl,
      presetId: options.presetId,
    });
    setStep('extracting');
    setActiveStageIdx(0);
    setProgressPercent(18);

    // Stage 1 -> Stage 2
    const timer1 = setTimeout(() => {
      setActiveStageIdx(1);
      setProgressPercent(56);
    }, 550);

    // Stage 2 -> Stage 3
    const timer2 = setTimeout(() => {
      setActiveStageIdx(2);
      setProgressPercent(88);
    }, 1100);

    let extractedList: ExtractedMenuItemDraft[] = [];

    // If user uploaded a real file, try calling server-side Gemini API in parallel with animation
    if (options.base64Data && options.mimeType && !options.presetId) {
      try {
        const res = await fetch('/api/menu/digitize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data: options.base64Data,
            mimeType: options.mimeType,
            fileName: options.fileName,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.items) && data.items.length > 0) {
            extractedList = createDraftItemsFromList(data.items);
          }
        }
      } catch {
        // Fallback to local smart parser below
      }
    }

    // Wait for minimum animation duration (1650ms) so the 3-stage progress is clearly visible
    await new Promise((resolve) => setTimeout(resolve, 1650));
    clearTimeout(timer1);
    clearTimeout(timer2);
    setProgressPercent(100);

    if (extractedList.length === 0) {
      const lowerName = options.fileName.toLowerCase();
      const chosenPresetKey: 'north_indian' | 'cafe_beverage' =
        options.presetId ||
        (lowerName.includes('cafe') ||
        lowerName.includes('coffee') ||
        lowerName.includes('beverage') ||
        lowerName.includes('bakery')
          ? 'cafe_beverage'
          : 'north_indian');

      const preset = SAMPLE_MENU_PRESETS[chosenPresetKey];
      extractedList = preset.items.map((item, idx) => {
        const detected = autoDetectDietaryType(item.name, item.description);
        return {
          ...item,
          id: `draft-${Date.now()}-${idx}`,
          selected: true,
          price: cleanNumericPrice(item.price),
          dietary: detected.dietary,
          autoDetectedDietReason:
            item.autoDetectedDietReason ||
            (detected.matchedKeyword
              ? `Matched "${detected.matchedKeyword}"`
              : `Auto-detected ${detected.dietary}`),
        };
      });
    }

    setDraftItems(extractedList);
    setOrganizerCategory('All');
    setStep('review');
  };

  // Handle Preset Button Click
  const handleSelectSamplePreset = (presetKey: 'north_indian' | 'cafe_beverage') => {
    const preset = SAMPLE_MENU_PRESETS[presetKey];
    runExtractionPipeline({
      fileName: preset.fileName,
      fileTypeLabel: preset.fileMeta,
      presetId: presetKey,
    });
  };

  // Handle File Upload (Drag & Drop or File Picker)
  const processUploadedFile = (file: File) => {
    const validTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'application/pdf',
    ];
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage =
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|webp)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !isPdf && !isImage) {
      return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const typeLabel = `${isPdf ? 'PDF Document' : 'Menu Image'} · ${sizeMB} MB`;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      runExtractionPipeline({
        fileName: file.name,
        fileTypeLabel: typeLabel,
        previewImageUrl: isImage ? dataUrl : undefined,
        base64Data: dataUrl,
        mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Inline item update handlers
  const handleUpdateDraftItem = (
    id: string,
    updates: Partial<ExtractedMenuItemDraft>
  ) => {
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...updates };
        // If name or description changed and dietary wasn't explicitly toggled in this call, re-run auto-detect
        if (
          (updates.name !== undefined || updates.description !== undefined) &&
          updates.dietary === undefined
        ) {
          const detected = autoDetectDietaryType(next.name, next.description);
          next.dietary = detected.dietary;
          next.autoDetectedDietReason = detected.matchedKeyword
            ? `Auto-detected ${detected.dietary} ("${detected.matchedKeyword}")`
            : next.autoDetectedDietReason;
        }
        return next;
      })
    );
  };

  const handleToggleSelectRow = (id: string) => {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setDraftItems((prev) =>
      prev.map((item) => {
        if (organizerCategory !== 'All' && item.category !== organizerCategory) {
          return item;
        }
        return { ...item, selected: checked };
      })
    );
  };

  const handleDeleteDraftRow = (id: string) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddBlankRow = () => {
    const defaultCat: MenuCategory =
      organizerCategory !== 'All'
        ? (organizerCategory as MenuCategory)
        : 'Curries';
    const newRow: ExtractedMenuItemDraft = {
      id: `draft-manual-${Date.now()}`,
      selected: true,
      name: 'New Dish Item',
      category: defaultCat,
      price: 450,
      dietary: 'Veg',
      description: 'House signature preparation with fresh seasonal spices.',
      autoDetectedDietReason: 'Manual entry',
    };
    setDraftItems((prev) => [...prev, newRow]);
  };

  // Bulk Edit Actions
  const handleBulkAssignCategory = () => {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.selected ? { ...item, category: bulkCategory } : item
      )
    );
  };

  const handleBulkAssignDietary = () => {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.selected ? { ...item, dietary: bulkDietary } : item
      )
    );
  };

  const handleBulkAdjustPrices = (multiplier: number, roundToTen = true) => {
    setDraftItems((prev) =>
      prev.map((item) => {
        if (!item.selected) return item;
        const rawNew = item.price * multiplier;
        const adjusted = roundToTen
          ? Math.max(10, Math.round(rawNew / 10) * 10)
          : Math.max(10, Math.round(rawNew));
        return { ...item, price: adjusted };
      })
    );
  };

  const handleReRunAutoDietClassification = () => {
    setDraftItems((prev) =>
      prev.map((item) => {
        const detected = autoDetectDietaryType(item.name, item.description);
        return {
          ...item,
          dietary: detected.dietary,
          autoDetectedDietReason: detected.matchedKeyword
            ? `Auto-detected ${detected.dietary} ("${detected.matchedKeyword}")`
            : `Auto-classified ${detected.dietary}`,
        };
      })
    );
  };

  // Filtered rows by Category Quick-Organizer
  const visibleDraftItems = draftItems.filter((item) =>
    organizerCategory === 'All' ? true : item.category === organizerCategory
  );

  const selectedItems = draftItems.filter((item) => item.selected);
  const selectedCount = selectedItems.length;
  const allVisibleSelected =
    visibleDraftItems.length > 0 &&
    visibleDraftItems.every((item) => item.selected);

  // Confirm & Add [X] Items to Menu
  const handleConfirmImport = () => {
    if (selectedCount === 0) return;

    const toImport: Array<Omit<MenuItem, 'id' | 'restaurantId'>> =
      selectedItems.map((item) => ({
        name: item.name.trim() || 'Untitled Dish',
        description:
          item.description.trim() || 'Prepared fresh to order in our kitchen.',
        price: cleanNumericPrice(item.price),
        category: item.category,
        dietary: item.dietary,
        isAvailable: true,
      }));

    onConfirmImportItems(toImport);
    resetAndClose();
  };

  // Distinct categories present in draft
  const categoryCounts = DIGITIZER_CATEGORIES.reduce<Record<string, number>>(
    (acc, cat) => {
      acc[cat] = draftItems.filter((i) => i.category === cat).length;
      return acc;
    },
    {}
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-menu-digitizer-title"
    >
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="ai-menu-digitizer-title"
                  className="text-lg font-semibold tracking-tight font-serif-display"
                >
                  ✨ AI Menu Digitizer — Photo &amp; PDF Import
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-amber-400/20 text-amber-300 rounded-md border border-amber-400/30">
                  OCR + Diet Auto-Classifier
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                Upload a physical menu photo or PDF for {restaurantName} — automatically extracts dishes, categories, ₹ prices, and Veg/Non-Veg tags.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            aria-label="Close AI Menu Digitizer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF9F6]">
          {/* STEP 1: UPLOAD OR SAMPLE PRESETS */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drag and drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all bg-white ${
                  isDragging
                    ? 'border-amber-600 bg-amber-50/40 scale-[0.995]'
                    : 'border-stone-300 hover:border-stone-900 hover:bg-stone-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processUploadedFile(file);
                  }}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>

                <h3 className="text-base sm:text-lg font-semibold text-stone-900">
                  Drag &amp; drop your physical menu photo or PDF here
                </h3>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  Supports high-resolution phone photos (<span className="font-mono font-semibold text-stone-700">PNG, JPG, WEBP</span>) and multi-page digital menu documents (<span className="font-mono font-semibold text-stone-700">PDF</span>).
                </p>

                <div className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>Browse Menu Image or PDF</span>
                </div>

                <div className="mt-6 pt-5 border-t border-stone-100 flex flex-wrap items-center justify-center gap-6 text-[11px] text-stone-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Auto-Detects Appetizers, Tandoor, Curries, Biryani, Breads
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Clean ₹ Price Extraction
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Smart Veg vs. Non-Veg Classifier
                  </span>
                </div>
              </div>

              {/* Sample Menu Presets for Immediate Testing */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Instant Testing Presets — Try Without Uploading a File
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Click either sample menu below to test full AI extraction
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Preset 1: Sample Indian North Indian Menu */}
                  <button
                    type="button"
                    onClick={() => handleSelectSamplePreset('north_indian')}
                    className="group text-left bg-white hover:bg-amber-50/30 border border-stone-200 hover:border-amber-500 rounded-2xl p-5 transition-all shadow-2xs flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                          <Sparkles className="w-3 h-3 text-amber-700" />
                          Sample Preset 1
                        </span>
                        <span className="text-[11px] font-mono text-stone-400">
                          12 Dishes · ₹160 – ₹790
                        </span>
                      </div>

                      <h4 className="text-base font-semibold text-stone-900 group-hover:text-amber-950 flex items-center justify-between">
                        <span>Try with Sample Indian North Indian Menu</span>
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        Extracts <strong className="font-medium text-stone-800">Amritsari Malai Paneer Tikka</strong>, <strong className="font-medium text-stone-800">Tandoori Murgh Angara</strong>, <strong className="font-medium text-stone-800">Dal Makhani</strong>, <strong className="font-medium text-stone-800">Rajasthani Laal Maas</strong>, <strong className="font-medium text-stone-800">Awadhi Dum Gosht Biryani</strong>, <strong className="font-medium text-stone-800">Chur Chur Naan</strong> &amp; more.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-stone-900">
                      <span className="text-[11px] text-stone-500 font-mono">
                        Tandoor · Curries · Biryani · Breads
                      </span>
                      <span className="inline-flex items-center gap-1 text-amber-800 group-hover:translate-x-0.5 transition-transform">
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Run AI Extraction →</span>
                      </span>
                    </div>
                  </button>

                  {/* Preset 2: Sample Cafe & Beverage Menu */}
                  <button
                    type="button"
                    onClick={() => handleSelectSamplePreset('cafe_beverage')}
                    className="group text-left bg-white hover:bg-stone-100/70 border border-stone-200 hover:border-stone-900 rounded-2xl p-5 transition-all shadow-2xs flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-800 border border-stone-300">
                          <FileText className="w-3 h-3 text-stone-700" />
                          Sample Preset 2
                        </span>
                        <span className="text-[11px] font-mono text-stone-400">
                          9 Items · ₹280 – ₹520
                        </span>
                      </div>

                      <h4 className="text-base font-semibold text-stone-900 flex items-center justify-between">
                        <span>Try with Cafe &amp; Beverage Menu</span>
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        Extracts <strong className="font-medium text-stone-800">Avocado &amp; Poached Egg Sourdough</strong>, <strong className="font-medium text-stone-800">Truffle Mushroom Croissant</strong>, <strong className="font-medium text-stone-800">Smoked Chicken Pesto Panini</strong>, <strong className="font-medium text-stone-800">Spanish Saffron Cortado</strong>, <strong className="font-medium text-stone-800">Iced Matcha Yuzu Fizz</strong> &amp; desserts.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-stone-900">
                      <span className="text-[11px] text-stone-500 font-mono">
                        Appetizers · Breads · Beverages · Desserts
                      </span>
                      <span className="inline-flex items-center gap-1 text-stone-900 group-hover:translate-x-0.5 transition-transform">
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Run AI Extraction →</span>
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AI EXTRACTION LOADING ANIMATION */}
          {step === 'extracting' && (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 sm:p-10 max-w-2xl mx-auto my-4 space-y-6 shadow-xs">
              <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-stone-900">
                      {sourceMeta?.fileName || 'Menu_Scan.jpg'}
                    </div>
                    <div className="text-xs text-stone-500 font-mono">
                      {sourceMeta?.fileTypeLabel || 'Analyzing document structure'}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-mono font-bold text-stone-900">
                  {progressPercent}%
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-900 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* 3-Stage AI Extraction Checklist */}
              <div className="space-y-3 pt-1">
                {EXTRACTION_STAGES.map((st, idx) => {
                  const isDone = idx < activeStageIdx;
                  const isCurrent = idx === activeStageIdx;
                  return (
                    <div
                      key={st.step}
                      className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                        isCurrent
                          ? 'bg-amber-50/60 border-amber-300 text-stone-900'
                          : isDone
                          ? 'bg-emerald-50/40 border-emerald-200 text-stone-800'
                          : 'bg-stone-50 border-stone-200/70 text-stone-400'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-stone-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold">{st.title}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {st.detail}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: INTERACTIVE REVIEW & APPROVE TABLE */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Source Banner & Summary Stats */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {sourceMeta?.previewImageUrl ? (
                    <img
                      src={sourceMeta.previewImageUrl}
                      alt="Uploaded menu preview"
                      className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-stone-900">
                        {sourceMeta?.fileName || 'Extracted Menu Catalog'}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                        {draftItems.length} Dishes Extracted
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Review and edit dish names, categories, ₹ prices, or toggle Veg/Non-Veg before adding to your live menu.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-mono bg-[#FAF9F6] border border-stone-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <span className="text-emerald-700 font-semibold">
                      {draftItems.filter((i) => i.dietary === 'Veg').length} Veg
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-rose-700 font-semibold">
                      {draftItems.filter((i) => i.dietary === 'Non-Veg').length} Non-Veg
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-stone-900 font-bold">
                      {selectedCount} Selected
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBlankRow}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Row</span>
                  </button>
                </div>
              </div>

              {/* Category Quick-Organizer Bar */}
              <div className="bg-white border border-stone-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1 mr-1 shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                    Category Organizer:
                  </span>
                  <button
                    type="button"
                    onClick={() => setOrganizerCategory('All')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                      organizerCategory === 'All'
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    All ({draftItems.length})
                  </button>
                  {DIGITIZER_CATEGORIES.map((cat) => {
                    const count = categoryCounts[cat] || 0;
                    if (count === 0 && organizerCategory !== cat) return null;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setOrganizerCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                          organizerCategory === cat
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleReRunAutoDietClassification}
                  className="text-[11px] font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/70 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                  title="Re-scan dish names and descriptions for paneer/dal/sabzi vs chicken/mutton/fish/prawn/egg"
                >
                  <Wand2 className="w-3 h-3 text-amber-600" />
                  <span>Auto-Verify Veg/Non-Veg Tags</span>
                </button>
              </div>

              {/* Expandable "Edit in Bulk" Toolbar */}
              {isBulkEditOpen && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-950">
                    <SlidersHorizontal className="w-4 h-4 text-amber-700" />
                    <span>
                      Bulk Edit ({selectedCount} selected items):
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Bulk Category */}
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200">
                      <span className="text-[11px] text-stone-500">Move to:</span>
                      <select
                        value={bulkCategory}
                        onChange={(e) =>
                          setBulkCategory(e.target.value as MenuCategory)
                        }
                        className="text-xs font-semibold text-stone-900 bg-transparent focus:outline-none"
                      >
                        {DIGITIZER_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleBulkAssignCategory}
                        className="px-2 py-0.5 bg-stone-900 text-white text-[11px] font-semibold rounded-md hover:bg-stone-800"
                      >
                        Apply
                      </button>
                    </div>

                    {/* Bulk Diet */}
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200">
                      <span className="text-[11px] text-stone-500">Set Diet:</span>
                      <select
                        value={bulkDietary}
                        onChange={(e) =>
                          setBulkDietary(e.target.value as DietaryType)
                        }
                        className="text-xs font-semibold text-stone-900 bg-transparent focus:outline-none"
                      >
                        <option value="Veg">Veg</option>
                        <option value="Non-Veg">Non-Veg</option>
                        <option value="Vegan">Vegan</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleBulkAssignDietary}
                        className="px-2 py-0.5 bg-stone-900 text-white text-[11px] font-semibold rounded-md hover:bg-stone-800"
                      >
                        Apply
                      </button>
                    </div>

                    {/* Bulk Price Adjustment */}
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200">
                      <span className="text-[11px] text-stone-500">Prices:</span>
                      <button
                        type="button"
                        onClick={() => handleBulkAdjustPrices(0.95)}
                        className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-mono font-semibold rounded-md"
                      >
                        -5%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkAdjustPrices(1.05)}
                        className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-mono font-semibold rounded-md"
                      >
                        +5%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkAdjustPrices(1.1)}
                        className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-mono font-semibold rounded-md"
                      >
                        +10%
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Editable Review Table */}
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                        <th className="py-3 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={(e) =>
                              handleToggleSelectAll(e.target.checked)
                            }
                            aria-label="Select all visible extracted items"
                            className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-3 min-w-[220px]">
                          Dish Name &amp; Description
                        </th>
                        <th className="py-3 px-3 w-44">Category</th>
                        <th className="py-3 px-3 w-36">Price (₹)</th>
                        <th className="py-3 px-3 w-40">Veg / Non-Veg</th>
                        <th className="py-3 px-3 w-12 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-xs">
                      {visibleDraftItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            item.selected
                              ? 'bg-white hover:bg-stone-50/60'
                              : 'bg-stone-50/60 opacity-60'
                          }`}
                        >
                          {/* Select Checkbox */}
                          <td className="py-3 px-4 text-center align-top pt-4">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleSelectRow(item.id)}
                              aria-label={`Select ${item.name}`}
                              className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                            />
                          </td>

                          {/* Inline Dish Name + Description */}
                          <td className="py-3 px-3 space-y-1.5 align-top">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                handleUpdateDraftItem(item.id, {
                                  name: e.target.value,
                                })
                              }
                              placeholder="Dish Name"
                              className="w-full px-2.5 py-1.5 text-xs font-semibold text-stone-900 bg-[#FAF9F6] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white"
                            />
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                handleUpdateDraftItem(item.id, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Description or key ingredients..."
                              className="w-full px-2.5 py-1 text-[11px] text-stone-600 bg-transparent border border-transparent hover:border-stone-200 focus:border-stone-300 rounded-md focus:outline-none focus:bg-white"
                            />
                          </td>

                          {/* Inline Category Select */}
                          <td className="py-3 px-3 align-top pt-3.5">
                            <select
                              value={item.category}
                              onChange={(e) =>
                                handleUpdateDraftItem(item.id, {
                                  category: e.target.value as MenuCategory,
                                })
                              }
                              aria-label={`Category for ${item.name}`}
                              className="w-full px-2.5 py-1.5 text-xs font-medium text-stone-800 bg-[#FAF9F6] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
                            >
                              {DIGITIZER_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Inline Price (₹) Input */}
                          <td className="py-3 px-3 align-top pt-3.5">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-stone-500">
                                ₹
                              </span>
                              <input
                                type="number"
                                min={1}
                                step={5}
                                value={item.price}
                                onChange={(e) =>
                                  handleUpdateDraftItem(item.id, {
                                    price: Math.max(
                                      0,
                                      parseInt(e.target.value || '0', 10)
                                    ),
                                  })
                                }
                                aria-label={`Price in INR for ${item.name}`}
                                className="w-full pl-6 pr-2.5 py-1.5 text-xs font-mono font-semibold text-stone-900 bg-[#FAF9F6] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900"
                              />
                            </div>
                          </td>

                          {/* Interactive Veg / Non-Veg Toggle */}
                          <td className="py-3 px-3 align-top pt-3.5">
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDraftItem(item.id, {
                                    dietary:
                                      item.dietary === 'Veg'
                                        ? 'Non-Veg'
                                        : 'Veg',
                                  })
                                }
                                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                  item.dietary === 'Non-Veg'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                }`}
                                title="Click to toggle Veg / Non-Veg"
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    item.dietary === 'Non-Veg'
                                      ? 'bg-rose-600'
                                      : 'bg-emerald-600'
                                  }`}
                                />
                                <span>{item.dietary}</span>
                              </button>
                              {item.autoDetectedDietReason && (
                                <span className="text-[10px] text-stone-400 truncate max-w-[135px]">
                                  {item.autoDetectedDietReason}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Remove Row */}
                          <td className="py-3 px-3 text-right align-top pt-4">
                            <button
                              type="button"
                              onClick={() => handleDeleteDraftRow(item.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Remove row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {step === 'review' ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkEditOpen((prev) => !prev)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isBulkEditOpen
                      ? 'bg-amber-100 border-amber-300 text-amber-950'
                      : 'bg-[#FAF9F6] border-stone-200 text-stone-800 hover:bg-stone-100'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Edit in Bulk</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-500 hidden sm:inline">
                  Avg price:{' '}
                  <strong className="font-mono text-stone-800">
                    {selectedCount > 0
                      ? formatCurrency(
                          Math.round(
                            selectedItems.reduce((s, i) => s + i.price, 0) /
                              selectedCount
                          )
                        )
                      : '₹0'}
                  </strong>
                </span>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={handleConfirmImport}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>
                    Confirm &amp; Add {selectedCount} Item
                    {selectedCount === 1 ? '' : 's'} to Menu
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-xs text-stone-500">
                Items imported are immediately live on <span className="font-mono text-stone-700">/menu</span>, Waiter Pad, and Table Order Drawer.
              </span>
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
