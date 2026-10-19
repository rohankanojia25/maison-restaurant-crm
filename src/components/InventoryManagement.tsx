import React, { useState, useMemo } from 'react';
import {
  Ingredient,
  IngredientCategory,
  MeasurementUnit,
  MenuItem,
  RecipeIngredientItem,
  InventoryMovement,
} from '../types';
import { formatCurrency } from '../utils/currency';
import { evaluateDishStock, convertUnitQuantity } from '../utils/inventory';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  CheckCircle2,
  XCircle,
  UtensilsCrossed,
  Layers,
  History,
  SlidersHorizontal,
  X,
  Check,
  Sparkles,
  Scale,
  RefreshCw,
} from 'lucide-react';

interface InventoryManagementProps {
  restaurantId: string;
  restaurantName: string;
  ingredients: Ingredient[];
  menuItems: MenuItem[];
  movements: InventoryMovement[];
  onAddIngredient: (
    ing: Omit<Ingredient, 'id' | 'restaurantId' | 'updatedAt'>
  ) => void;
  onRestockIngredient: (
    ingredientId: string,
    addedQty: number,
    reason: string
  ) => void;
  onLogWastage: (
    ingredientId: string,
    wastageQty: number,
    reason: string
  ) => void;
  onSetIngredientStock: (
    ingredientId: string,
    newStock: number,
    reason: string
  ) => void;
  onDeleteIngredient: (ingredientId: string) => void;
  onUpdateDishRecipe: (
    menuItemId: string,
    recipe: RecipeIngredientItem[]
  ) => void;
  onToggleDishAvailability: (
    menuItemId: string,
    manualOverride?: boolean
  ) => void;
}

const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  'Dairy',
  'Poultry/Meat',
  'Dry Staples',
  'Produce',
  'Spices',
];

const UNITS: MeasurementUnit[] = ['g', 'kg', 'ml', 'L', 'pcs'];

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  restaurantName,
  ingredients,
  menuItems,
  movements,
  onAddIngredient,
  onRestockIngredient,
  onLogWastage,
  onSetIngredientStock,
  onDeleteIngredient,
  onUpdateDishRecipe,
  onToggleDishAvailability,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ingredients' | 'recipes' | 'movements'>(
    'ingredients'
  );

  // Filters for Ingredients tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | IngredientCategory>('All');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals state
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [addStockMode, setAddStockMode] = useState<'restock' | 'new'>('restock');
  const [selectedIngIdForRestock, setSelectedIngIdForRestock] = useState<string>(
    ingredients[0]?.id || ''
  );
  const [restockQty, setRestockQty] = useState<string>('500');
  const [restockReason, setRestockReason] = useState<string>('Vendor morning delivery');

  // New Ingredient fields
  const [newIngName, setNewIngName] = useState('');
  const [newIngCategory, setNewIngCategory] = useState<IngredientCategory>('Dairy');
  const [newIngUnit, setNewIngUnit] = useState<MeasurementUnit>('g');
  const [newIngStock, setNewIngStock] = useState('1000');
  const [newIngThreshold, setNewIngThreshold] = useState('300');
  const [newIngCost, setNewIngCost] = useState('0.35');

  // Wastage Modal state
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [selectedIngIdForWastage, setSelectedIngIdForWastage] = useState<string>(
    ingredients[0]?.id || ''
  );
  const [wastageQty, setWastageQty] = useState<string>('150');
  const [wastageReason, setWastageReason] = useState<string>('Spoilage / Prep trimmings');

  // Recipe Mapping state
  const [selectedDishId, setSelectedDishId] = useState<string>(() => {
    const firstWithRecipe = menuItems.find((m) => m.recipe && m.recipe.length > 0);
    return firstWithRecipe?.id || menuItems[0]?.id || '';
  });
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [newRecipeIngId, setNewRecipeIngId] = useState<string>(ingredients[0]?.id || '');
  const [newRecipeQty, setNewRecipeQty] = useState<string>('100');
  const [newRecipeUnit, setNewRecipeUnit] = useState<MeasurementUnit>('g');

  // Summary metrics
  const lowStockCount = useMemo(
    () => ingredients.filter((i) => i.currentStock > 0 && i.currentStock <= i.minThreshold).length,
    [ingredients]
  );
  const depletedCount = useMemo(
    () => ingredients.filter((i) => i.currentStock <= 0).length,
    [ingredients]
  );
  const totalInventoryValuation = useMemo(
    () =>
      ingredients.reduce(
        (sum, ing) => sum + Math.max(0, ing.currentStock) * ing.costPerUnit,
        0
      ),
    [ingredients]
  );
  const mappedDishesCount = useMemo(
    () => menuItems.filter((m) => m.recipe && m.recipe.length > 0).length,
    [menuItems]
  );
  const auto86DishesCount = useMemo(
    () =>
      menuItems.filter((m) => {
        const ev = evaluateDishStock(m, ingredients);
        return !ev.isEffectivelyAvailable;
      }).length,
    [menuItems, ingredients]
  );

  // Filtered Ingredients
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) => {
      if (selectedCategory !== 'All' && ing.category !== selectedCategory) return false;
      if (lowStockOnly && ing.currentStock > ing.minThreshold) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ing.name.toLowerCase().includes(q) ||
          ing.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ingredients, selectedCategory, lowStockOnly, searchQuery]);

  // Filtered Dishes for Recipe Mapping
  const filteredDishes = useMemo(() => {
    if (!recipeSearchQuery.trim()) return menuItems;
    const q = recipeSearchQuery.toLowerCase();
    return menuItems.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [menuItems, recipeSearchQuery]);

  const activeDish = useMemo(
    () => menuItems.find((m) => m.id === selectedDishId) || menuItems[0] || null,
    [menuItems, selectedDishId]
  );

  // Find dishes using a specific ingredient
  const getDishesUsingIngredient = (ingredientId: string): MenuItem[] => {
    return menuItems.filter((m) =>
      (m.recipe || []).some((r) => r.ingredientId === ingredientId)
    );
  };

  // Handlers
  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addStockMode === 'restock') {
      const qty = parseFloat(restockQty);
      if (!selectedIngIdForRestock || isNaN(qty) || qty <= 0) return;
      onRestockIngredient(
        selectedIngIdForRestock,
        qty,
        restockReason.trim() || 'Manual stock replenishment'
      );
    } else {
      if (!newIngName.trim()) return;
      onAddIngredient({
        name: newIngName.trim(),
        category: newIngCategory,
        unit: newIngUnit,
        currentStock: Math.max(0, parseFloat(newIngStock) || 0),
        minThreshold: Math.max(0, parseFloat(newIngThreshold) || 0),
        costPerUnit: Math.max(0, parseFloat(newIngCost) || 0),
      });
      setNewIngName('');
    }
    setIsAddStockModalOpen(false);
  };

  const handleWastageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(wastageQty);
    if (!selectedIngIdForWastage || isNaN(qty) || qty <= 0) return;
    onLogWastage(
      selectedIngIdForWastage,
      qty,
      wastageReason.trim() || 'Kitchen spoilage / wastage'
    );
    setIsWastageModalOpen(false);
  };

  const handleAddRecipeIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDish || !newRecipeIngId) return;
    const qty = parseFloat(newRecipeQty);
    if (isNaN(qty) || qty <= 0) return;

    const currentRecipe = activeDish.recipe || [];
    const existingIdx = currentRecipe.findIndex(
      (r) => r.ingredientId === newRecipeIngId
    );

    let updated: RecipeIngredientItem[];
    if (existingIdx >= 0) {
      updated = currentRecipe.map((r, i) =>
        i === existingIdx ? { ...r, quantity: qty, unit: newRecipeUnit } : r
      );
    } else {
      updated = [
        ...currentRecipe,
        {
          ingredientId: newRecipeIngId,
          quantity: qty,
          unit: newRecipeUnit,
        },
      ];
    }

    onUpdateDishRecipe(activeDish.id, updated);
  };

  const handleRemoveRecipeIngredient = (ingredientId: string) => {
    if (!activeDish) return;
    const updated = (activeDish.recipe || []).filter(
      (r) => r.ingredientId !== ingredientId
    );
    onUpdateDishRecipe(activeDish.id, updated);
  };

  const handleUpdateRecipeQty = (ingredientId: string, newQty: number) => {
    if (!activeDish || isNaN(newQty) || newQty < 0) return;
    const updated = (activeDish.recipe || []).map((r) =>
      r.ingredientId === ingredientId ? { ...r, quantity: newQty } : r
    );
    onUpdateDishRecipe(activeDish.id, updated);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER & LIVE INVENTORY KPI STRIP                          */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif-display text-stone-900">
                  Recipe-Linked Inventory &amp; BOM
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono-tabular">
                  AUTO-86 ENGINE ACTIVE
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {restaurantName} · Real-time raw material deduction on KOT / bill settlement &amp; automatic out-of-stock protection
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setAddStockMode('restock');
                setSelectedIngIdForRestock(ingredients[0]?.id || '');
                setIsAddStockModalOpen(true);
              }}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 min-h-[42px]"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Stock / New Ingredient</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedIngIdForWastage(ingredients[0]?.id || '');
                setIsWastageModalOpen(true);
              }}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 min-h-[42px]"
            >
              <Flame className="w-4 h-4 text-rose-600" />
              <span>Log Wastage / Spoilage</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/80">
            <span className="text-[11px] font-medium text-stone-500">
              Raw Ingredients Tracked
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono-tabular text-stone-900">
                {ingredients.length}
              </span>
              <span className="text-[11px] font-mono-tabular text-stone-500">
                Valued at {formatCurrency(Math.round(totalInventoryValuation))}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-[11px] font-medium text-amber-900">
              Low-Stock / Depleted Alerts
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono-tabular text-amber-900">
                {lowStockCount + depletedCount}
              </span>
              <span className="text-[11px] font-mono-tabular text-amber-800 font-semibold">
                {depletedCount} Out of Stock · {lowStockCount} Low
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-stone-200/80">
            <span className="text-[11px] font-medium text-stone-500">
              Recipe-Mapped Dishes (BOM)
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono-tabular text-stone-900">
                {mappedDishesCount} / {menuItems.length}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">
                Auto-deduct linked
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200">
            <span className="text-[11px] font-medium text-rose-900">
              86&apos;d / Sold Out Dishes
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono-tabular text-rose-800">
                {auto86DishesCount}
              </span>
              <span className="text-[11px] text-rose-700 font-medium">
                Blocked on Waiter Pad
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. PRIMARY TABS: "Ingredients" | "Recipe Mapping" | "Log"     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('ingredients')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all min-h-[40px] ${
              activeSubTab === 'ingredients'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Ingredients ({ingredients.length})</span>
            {lowStockCount + depletedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950">
                {lowStockCount + depletedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('recipes')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all min-h-[40px] ${
              activeSubTab === 'recipes'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Recipe Mapping ({mappedDishesCount} Linked)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('movements')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all min-h-[40px] ${
              activeSubTab === 'movements'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Stock Movement Log ({movements.length})</span>
          </button>
        </div>

        {activeSubTab === 'ingredients' && (
          <div className="flex items-center gap-2 flex-wrap px-2">
            {/* Low Stock Filter Button */}
            <button
              type="button"
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 min-h-[36px] ${
                lowStockOnly
                  ? 'bg-amber-500 text-stone-950 border-amber-600 font-bold shadow-xs'
                  : 'bg-[#FAF9F6] text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Low Stock Filter ({lowStockCount + depletedCount})</span>
            </button>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search paneer, cream, rice..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-900 w-48"
              />
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: RAW MATERIALS & INGREDIENTS DIRECTORY                  */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'ingredients' && (
        <div className="space-y-4">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(['All', ...INGREDIENT_CATEGORIES] as const).map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Ingredients Table */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    <th className="py-3.5 px-4">Raw Ingredient</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">In-Stock Qty</th>
                    <th className="py-3.5 px-4">Low-Stock Alert</th>
                    <th className="py-3.5 px-4">Unit Cost (₹)</th>
                    <th className="py-3.5 px-4">Linked Dishes</th>
                    <th className="py-3.5 px-4 text-right">Quick Stock Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {filteredIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-500">
                        No raw ingredients match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredIngredients.map((ing) => {
                      const isDepleted = ing.currentStock <= 0;
                      const isLow =
                        !isDepleted && ing.currentStock <= ing.minThreshold;
                      const linkedDishes = getDishesUsingIngredient(ing.id);
                      const stockPct = Math.min(
                        100,
                        Math.round(
                          (ing.currentStock / Math.max(1, ing.minThreshold * 2.5)) *
                            100
                        )
                      );

                      return (
                        <tr
                          key={ing.id}
                          className={`transition-colors ${
                            isDepleted
                              ? 'bg-rose-50/50 hover:bg-rose-50/80'
                              : isLow
                              ? 'bg-amber-50/30 hover:bg-amber-50/60'
                              : 'hover:bg-stone-50/80'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-stone-900 text-sm">
                              {ing.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              {isDepleted ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                                  Out of Stock (0 {ing.unit})
                                </span>
                              ) : isLow ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Low Stock Alert
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Healthy Stock
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-medium text-xs">
                              {ing.category}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-mono-tabular font-bold text-sm text-stone-900">
                              {ing.currentStock.toLocaleString('en-IN')}{' '}
                              <span className="text-xs font-normal text-stone-500">
                                {ing.unit}
                              </span>
                            </div>
                            <div className="w-28 h-1.5 bg-stone-200 rounded-full overflow-hidden mt-1.5">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isDepleted
                                    ? 'bg-rose-600 w-0'
                                    : isLow
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-600'
                                }`}
                                style={{ width: `${stockPct}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono-tabular text-stone-600">
                            Min: {ing.minThreshold.toLocaleString('en-IN')} {ing.unit}
                          </td>

                          <td className="py-3.5 px-4 font-mono-tabular">
                            <div className="font-semibold text-stone-900">
                              ₹{ing.costPerUnit.toFixed(2)} / {ing.unit}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              Total:{' '}
                              {formatCurrency(
                                Math.round(ing.currentStock * ing.costPerUnit)
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {linkedDishes.length === 0 ? (
                              <span className="text-stone-400 italic">
                                Not mapped
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {linkedDishes.map((d) => (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedDishId(d.id);
                                      setActiveSubTab('recipes');
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-medium truncate max-w-[160px]"
                                  >
                                    {d.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAddStockMode('restock');
                                  setSelectedIngIdForRestock(ing.id);
                                  setRestockQty(
                                    ing.unit === 'g' || ing.unit === 'ml'
                                      ? '500'
                                      : '5'
                                  );
                                  setIsAddStockModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-semibold text-[11px] transition-colors"
                              >
                                + Add Stock
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIngIdForWastage(ing.id);
                                  setWastageQty(
                                    ing.unit === 'g' || ing.unit === 'ml'
                                      ? '100'
                                      : '1'
                                  );
                                  setIsWastageModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-semibold text-[11px] transition-colors"
                              >
                                Wastage
                              </button>

                              {ing.currentStock > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onSetIngredientStock(
                                      ing.id,
                                      0,
                                      'Depleted to 0 (Auto-86 test)'
                                    )
                                  }
                                  title="Set stock to 0 to test automatic 86 / Out-of-Stock on mapped dishes"
                                  className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-[11px] transition-colors"
                                >
                                  Set 0
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRestockIngredient(
                                      ing.id,
                                      ing.minThreshold * 2,
                                      'Quick emergency restock'
                                    )
                                  }
                                  className="px-2 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-semibold text-[11px] transition-colors"
                                >
                                  Restock
                                </button>
                              )}
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

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DISH RECIPE MAPPING (BILL OF MATERIALS / BOM)          */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): Dish Selector List */}
          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900">
                Menu Dishes ({menuItems.length})
              </h2>
              <span className="text-[11px] text-stone-500 font-mono-tabular">
                {mappedDishesCount} mapped to recipes
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recipeSearchQuery}
                onChange={(e) => setRecipeSearchQuery(e.target.value)}
                placeholder="Search dish to map ingredients..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAF9F6] border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>

            <div className="divide-y divide-stone-100 max-h-[560px] overflow-y-auto pr-1">
              {filteredDishes.map((dish) => {
                const evalStock = evaluateDishStock(dish, ingredients);
                const isSelected = activeDish?.id === dish.id;
                const recipeCount = dish.recipe?.length || 0;

                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => setSelectedDishId(dish.id)}
                    className={`w-full py-3 px-3 text-left transition-all flex items-center justify-between gap-2 rounded-xl ${
                      isSelected
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'hover:bg-stone-50 text-stone-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs truncate">
                          {dish.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono-tabular ${
                            isSelected ? 'text-stone-300' : 'text-stone-500'
                          }`}
                        >
                          {formatCurrency(dish.price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] ${
                            isSelected ? 'text-stone-300' : 'text-stone-500'
                          }`}
                        >
                          {dish.category}
                        </span>
                        <span>·</span>
                        {recipeCount > 0 ? (
                          <span
                            className={`text-[10px] font-mono-tabular font-semibold ${
                              isSelected ? 'text-amber-300' : 'text-stone-700'
                            }`}
                          >
                            {recipeCount} ingredients
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] italic ${
                              isSelected ? 'text-stone-400' : 'text-stone-400'
                            }`}
                          >
                            No recipe linked
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {!evalStock.isEffectivelyAvailable ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white">
                          {evalStock.isAuto86d ? 'Auto-86 (Sold Out)' : '86 / Sold Out'}
                        </span>
                      ) : evalStock.hasRecipe ? (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono-tabular font-semibold ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {evalStock.maxServings} servings avail
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] ${
                            isSelected ? 'text-stone-400' : 'text-stone-400'
                          }`}
                        >
                          Available
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column (7 cols): Active Dish Recipe Bill of Materials Editor */}
          <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            {activeDish ? (
              (() => {
                const evalStock = evaluateDishStock(activeDish, ingredients);
                const marginPct =
                  activeDish.price > 0 && evalStock.recipeFoodCost > 0
                    ? Math.round(
                        ((activeDish.price - evalStock.recipeFoodCost) /
                          activeDish.price) *
                          100
                      )
                    : null;

                return (
                  <>
                    {/* Dish Header & Manual Override Toggle */}
                    <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-stone-200">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-bold font-serif-display text-stone-900">
                            {activeDish.name}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-mono-tabular font-bold bg-stone-100 text-stone-900">
                            Menu Price: {formatCurrency(activeDish.price)}
                          </span>
                          {!evalStock.isEffectivelyAvailable ? (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-600 text-white flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              SOLD OUT / 86&apos;d
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-900 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              Available ({evalStock.maxServings ?? '∞'} servings)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                          {activeDish.description}
                        </p>
                      </div>

                      {/* Manual Override / 86 Toggle */}
                      <div className="flex items-center gap-2">
                        {!evalStock.isRecipeSufficient && (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleDishAvailability(
                                activeDish.id,
                                !activeDish.manualOverrideAvailable
                              )
                            }
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                              activeDish.manualOverrideAvailable
                                ? 'bg-amber-500 text-stone-950 border-amber-600'
                                : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-300'
                            }`}
                          >
                            {activeDish.manualOverrideAvailable
                              ? 'Override Active: Marked Available Anyway'
                              : 'Mark Available Anyway (Override)'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onToggleDishAvailability(activeDish.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            evalStock.isEffectivelyAvailable
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          }`}
                        >
                          {evalStock.isEffectivelyAvailable
                            ? '86 Dish Manually'
                            : 'Restore Dish Availability'}
                        </button>
                      </div>
                    </div>

                    {/* Alert if Depleted Ingredients Triggered Auto-86 */}
                    {evalStock.missingIngredients.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">
                            Automatic 86 / Out-of-Stock Triggered!
                          </div>
                          <p className="text-rose-700 mt-0.5">
                            Insufficient stock for:{' '}
                            <strong>{evalStock.missingIngredients.join(', ')}</strong>.
                            Waiters and guests are prevented from ordering this dish until stock is replenished or manually overridden.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Recipe Cost & Margin Strip */}
                    <div className="grid grid-cols-3 gap-3 bg-[#FAF9F6] p-3.5 rounded-xl border border-stone-200 text-xs">
                      <div>
                        <span className="text-stone-500 block">
                          Recipe Food Cost
                        </span>
                        <span className="font-mono-tabular font-bold text-sm text-stone-900">
                          {formatCurrency(evalStock.recipeFoodCost)} / portion
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-500 block">
                          Gross Margin
                        </span>
                        <span className="font-mono-tabular font-bold text-sm text-emerald-700">
                          {marginPct !== null ? `${marginPct}%` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-500 block">
                          Max Servings Possible
                        </span>
                        <span className="font-mono-tabular font-bold text-sm text-stone-900">
                          {evalStock.maxServings !== null
                            ? `${evalStock.maxServings} portions`
                            : 'Unlinked'}
                        </span>
                      </div>
                    </div>

                    {/* Current Linked Ingredients Table */}
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        Bill of Materials (Ingredients per 1 Serving)
                      </h3>

                      {!activeDish.recipe || activeDish.recipe.length === 0 ? (
                        <div className="p-8 rounded-xl border-2 border-dashed border-stone-200 text-center space-y-2">
                          <Scale className="w-7 h-7 text-stone-400 mx-auto" />
                          <p className="text-xs font-semibold text-stone-700">
                            No raw ingredients linked to {activeDish.name} yet.
                          </p>
                          <p className="text-[11px] text-stone-500">
                            Use the form below to link raw materials so every order automatically deducts stock.
                          </p>
                        </div>
                      ) : (
                        <div className="border border-stone-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold uppercase text-stone-500">
                                <th className="py-2.5 px-3">Ingredient</th>
                                <th className="py-2.5 px-3">Qty per Dish</th>
                                <th className="py-2.5 px-3">Available Stock</th>
                                <th className="py-2.5 px-3">Line Cost</th>
                                <th className="py-2.5 px-3 text-right">Remove</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {activeDish.recipe.map((req) => {
                                const ing = ingredients.find(
                                  (i) => i.id === req.ingredientId
                                );
                                if (!ing) return null;
                                const reqInIngUnit = convertUnitQuantity(
                                  req.quantity,
                                  req.unit,
                                  ing.unit
                                );
                                const hasEnough =
                                  ing.currentStock >= reqInIngUnit &&
                                  ing.currentStock > 0;
                                const lineCost = reqInIngUnit * ing.costPerUnit;

                                return (
                                  <tr key={req.ingredientId}>
                                    <td className="py-2.5 px-3 font-semibold text-stone-900">
                                      {ing.name}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          min="1"
                                          step="any"
                                          value={req.quantity}
                                          onChange={(e) =>
                                            handleUpdateRecipeQty(
                                              req.ingredientId,
                                              parseFloat(e.target.value)
                                            )
                                          }
                                          className="w-20 px-2 py-1 text-xs font-mono-tabular bg-[#FAF9F6] border border-stone-300 rounded-lg"
                                        />
                                        <span className="font-mono-tabular text-stone-600">
                                          {req.unit}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono-tabular">
                                      <span
                                        className={`font-bold ${
                                          hasEnough
                                            ? 'text-emerald-700'
                                            : 'text-rose-600'
                                        }`}
                                      >
                                        {ing.currentStock} {ing.unit}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono-tabular text-stone-700">
                                      {formatCurrency(lineCost)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveRecipeIngredient(
                                            req.ingredientId
                                          )
                                        }
                                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Add Ingredient to Recipe Form */}
                    <form
                      onSubmit={handleAddRecipeIngredient}
                      className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200 space-y-3"
                    >
                      <div className="text-xs font-bold text-stone-800">
                        + Link Ingredient to {activeDish.name}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-6">
                          <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
                            Raw Material
                          </label>
                          <select
                            value={newRecipeIngId}
                            onChange={(e) => {
                              setNewRecipeIngId(e.target.value);
                              const found = ingredients.find(
                                (i) => i.id === e.target.value
                              );
                              if (found) setNewRecipeUnit(found.unit);
                            }}
                            className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl font-medium"
                          >
                            {ingredients.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name} (Stock: {i.currentStock} {i.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
                            Quantity Needed
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            required
                            value={newRecipeQty}
                            onChange={(e) => setNewRecipeQty(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono-tabular bg-white border border-stone-200 rounded-xl"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
                            Unit
                          </label>
                          <select
                            value={newRecipeUnit}
                            onChange={(e) =>
                              setNewRecipeUnit(e.target.value as MeasurementUnit)
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl font-mono-tabular"
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
                        >
                          Add / Update Recipe Requirement
                        </button>
                      </div>
                    </form>
                  </>
                );
              })()
            ) : (
              <p className="text-xs text-stone-500">
                Select a dish on the left to configure its recipe mapping.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: INVENTORY MOVEMENT LOG                                 */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'movements' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 bg-[#FAF9F6] border-b border-stone-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                Real-Time Inventory Movement Ledger
              </h2>
              <p className="text-xs text-stone-500">
                Audit trail of all KOT recipe deductions, vendor deliveries, and kitchen wastage logs
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Ingredient</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Qty Change</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4">Order / Reference Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {movements.map((mov) => {
                  const isPositive = mov.quantity > 0;
                  return (
                    <tr key={mov.id} className="hover:bg-stone-50/70">
                      <td className="py-3 px-4 font-mono-tabular text-stone-500">
                        {new Date(mov.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {mov.ingredientName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            mov.type === 'order_deduction'
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              : mov.type === 'restock'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {mov.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 font-mono-tabular font-bold ${
                          isPositive ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? `+${mov.quantity}` : mov.quantity} {mov.unit}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-stone-700">
                        {mov.balanceAfter} {mov.unit}
                      </td>
                      <td className="py-3 px-4 text-stone-700">{mov.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD STOCK / NEW INGREDIENT                           */}
      {/* ------------------------------------------------------------- */}
      {isAddStockModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold font-serif-display text-stone-900">
                {addStockMode === 'restock'
                  ? 'Replenish Raw Material Stock'
                  : 'Add New Raw Ingredient'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddStockModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAddStockMode('restock')}
                className={`py-1.5 rounded-lg transition-all ${
                  addStockMode === 'restock'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600'
                }`}
              >
                Restock Existing
              </button>
              <button
                type="button"
                onClick={() => setAddStockMode('new')}
                className={`py-1.5 rounded-lg transition-all ${
                  addStockMode === 'new'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600'
                }`}
              >
                + New Ingredient
              </button>
            </div>

            <form onSubmit={handleAddStockSubmit} className="space-y-3 text-xs">
              {addStockMode === 'restock' ? (
                <>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Select Ingredient
                    </label>
                    <select
                      value={selectedIngIdForRestock}
                      onChange={(e) => setSelectedIngIdForRestock(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl font-medium"
                    >
                      {ingredients.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} (Current: {i.currentStock} {i.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Quantity to Add
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl font-mono-tabular"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Delivery / Supplier Note
                    </label>
                    <input
                      type="text"
                      value={restockReason}
                      onChange={(e) => setRestockReason(e.target.value)}
                      placeholder="e.g. Morning dairy batch delivery"
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Ingredient Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newIngName}
                      onChange={(e) => setNewIngName(e.target.value)}
                      placeholder="e.g. Kashmiri Chili Paste"
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Category
                      </label>
                      <select
                        value={newIngCategory}
                        onChange={(e) =>
                          setNewIngCategory(e.target.value as IngredientCategory)
                        }
                        className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl"
                      >
                        {INGREDIENT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Unit of Measurement
                      </label>
                      <select
                        value={newIngUnit}
                        onChange={(e) =>
                          setNewIngUnit(e.target.value as MeasurementUnit)
                        }
                        className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl font-mono-tabular"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Opening Stock
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newIngStock}
                        onChange={(e) => setNewIngStock(e.target.value)}
                        className="w-full px-2.5 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Low Alert Min
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newIngThreshold}
                        onChange={(e) => setNewIngThreshold(e.target.value)}
                        className="w-full px-2.5 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Cost / Unit (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newIngCost}
                        onChange={(e) => setNewIngCost(e.target.value)}
                        className="w-full px-2.5 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl font-mono-tabular"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddStockModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stone-900 text-white font-semibold"
                >
                  {addStockMode === 'restock'
                    ? 'Confirm Restock'
                    : 'Create Ingredient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: LOG WASTAGE / SPOILAGE                               */}
      {/* ------------------------------------------------------------- */}
      {isWastageModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold font-serif-display text-rose-900">
                Log Kitchen Wastage / Spoilage
              </h3>
              <button
                type="button"
                onClick={() => setIsWastageModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWastageSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Select Ingredient
                </label>
                <select
                  value={selectedIngIdForWastage}
                  onChange={(e) => setSelectedIngIdForWastage(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl font-medium"
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (In Stock: {i.currentStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Quantity Wasted / Spoiled
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={wastageQty}
                  onChange={(e) => setWastageQty(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl font-mono-tabular"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Reason for Wastage
                </label>
                <input
                  type="text"
                  required
                  value={wastageReason}
                  onChange={(e) => setWastageReason(e.target.value)}
                  placeholder="e.g. Walk-in cooler spoilage / Burnt batch"
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-stone-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsWastageModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold"
                >
                  Deduct Wastage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
