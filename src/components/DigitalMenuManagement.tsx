import React, { useState } from 'react';
import {
  MenuItem,
  MenuCategory,
  DietaryType,
  Ingredient,
  RecipeIngredientItem,
  MeasurementUnit,
} from '../types';
import { MENU_CATEGORIES } from '../data/seedData';
import { formatCurrency } from '../utils/currency';
import { evaluateDishStock } from '../utils/inventory';
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  UtensilsCrossed,
  Edit2,
  Trash2,
  X,
  Check,
  Leaf,
  Scale,
  AlertTriangle,
  Package,
  Sparkles,
} from 'lucide-react';

interface DigitalMenuManagementProps {
  restaurantName: string;
  menuItems: MenuItem[];
  ingredients?: Ingredient[];
  onAddMenuItem: (item: Omit<MenuItem, 'id' | 'restaurantId'>) => void;
  onUpdateMenuItem: (id: string, updated: Partial<MenuItem>) => void;
  onDeleteMenuItem: (id: string) => void;
  onToggleAvailability: (id: string, manualOverride?: boolean) => void;
  onNavigateToInventory?: () => void;
  onOpenAiMenuImport?: () => void;
}

const UNITS: MeasurementUnit[] = ['g', 'kg', 'ml', 'L', 'pcs'];

export const DigitalMenuManagement: React.FC<DigitalMenuManagementProps> = ({
  restaurantName,
  menuItems,
  ingredients = [],
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onToggleAvailability,
  onNavigateToInventory,
  onOpenAiMenuImport,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDietary, setSelectedDietary] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(450);
  const [category, setCategory] = useState<MenuCategory>('Starters');
  const [dietary, setDietary] = useState<DietaryType>('Veg');
  const [isAvailable, setIsAvailable] = useState(true);
  const [manualOverrideAvailable, setManualOverrideAvailable] = useState(false);
  const [recipe, setRecipe] = useState<RecipeIngredientItem[]>([]);

  // Inline recipe add inside modal
  const [selectedIngId, setSelectedIngId] = useState<string>(ingredients[0]?.id || '');
  const [ingQty, setIngQty] = useState<string>('100');
  const [ingUnit, setIngUnit] = useState<MeasurementUnit>('g');

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setPrice(450);
    setCategory(
      selectedCategory !== 'All' ? (selectedCategory as MenuCategory) : 'Starters'
    );
    setDietary('Veg');
    setIsAvailable(true);
    setManualOverrideAvailable(false);
    setRecipe([]);
    setSelectedIngId(ingredients[0]?.id || '');
    setIngQty('100');
    setIngUnit(ingredients[0]?.unit || 'g');
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description);
    setPrice(item.price);
    setCategory(item.category);
    setDietary(item.dietary);
    setIsAvailable(item.isAvailable);
    setManualOverrideAvailable(Boolean(item.manualOverrideAvailable));
    setRecipe(item.recipe ? [...item.recipe] : []);
    setSelectedIngId(ingredients[0]?.id || '');
    setIngQty('100');
    setIngUnit(ingredients[0]?.unit || 'g');
    setIsModalOpen(true);
  };

  const handleAddRecipeRow = () => {
    if (!selectedIngId) return;
    const qtyNum = parseFloat(ingQty);
    if (isNaN(qtyNum) || qtyNum <= 0) return;

    const existingIdx = recipe.findIndex((r) => r.ingredientId === selectedIngId);
    if (existingIdx >= 0) {
      setRecipe(
        recipe.map((r, i) =>
          i === existingIdx ? { ...r, quantity: qtyNum, unit: ingUnit } : r
        )
      );
    } else {
      setRecipe([
        ...recipe,
        { ingredientId: selectedIngId, quantity: qtyNum, unit: ingUnit },
      ]);
    }
  };

  const handleRemoveRecipeRow = (ingredientId: string) => {
    setRecipe(recipe.filter((r) => r.ingredientId !== ingredientId));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItem) {
      onUpdateMenuItem(editingItem.id, {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        dietary,
        isAvailable,
        manualOverrideAvailable,
        recipe,
      });
    } else {
      onAddMenuItem({
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        dietary,
        isAvailable,
        manualOverrideAvailable,
        recipe,
      });
    }
    setIsModalOpen(false);
  };

  const filteredItems = menuItems.filter((item) => {
    if (
      selectedCategory !== 'All' &&
      item.category !== selectedCategory &&
      !(selectedCategory === 'Starters' && item.category === 'Appetizers')
    )
      return false;
    if (selectedDietary !== 'All' && item.dietary !== selectedDietary) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const totalCount = menuItems.length;
  const inStockCount = menuItems.filter(
    (i) => evaluateDishStock(i, ingredients).isEffectivelyAvailable
  ).length;
  const eightySixCount = totalCount - inStockCount;

  const renderDietaryBadge = (type: DietaryType) => {
    switch (type) {
      case 'Veg':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Veg
          </span>
        );
      case 'Vegan':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
            <Leaf className="w-2.5 h-2.5 text-teal-700" />
            Vegan
          </span>
        );
      case 'Non-Veg':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            Non-Veg
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and KPI strip */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className="font-mono-tabular">/menu</span>
              <span aria-hidden="true">·</span>
              <span>Digital Kitchen &amp; Bar Menu · Recipe-Linked BOM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 font-serif-display mt-0.5">
              Menu Management — {restaurantName}
            </h1>
            <p className="text-xs text-stone-600 mt-1">
              Real-time culinary catalog with recipe-linked inventory auto-86 protection, manual availability override, and dine-in POS integration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono-tabular bg-[#FAF9F6] border border-stone-200 px-3 py-2 rounded-xl">
              <span className="text-emerald-700 font-semibold">{inStockCount} In Stock</span>
              <span className="text-stone-300">/</span>
              <span className="text-rose-700 font-semibold">{eightySixCount} 86&apos;d</span>
              <span className="text-stone-300">/</span>
              <span className="text-stone-600">{totalCount} Total Items</span>
            </div>

            {onNavigateToInventory && (
              <button
                type="button"
                onClick={onNavigateToInventory}
                className="px-3.5 py-2.5 bg-[#FAF9F6] hover:bg-stone-100 text-stone-800 border border-stone-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Package className="w-3.5 h-3.5 text-stone-700" />
                <span>Inventory &amp; BOM</span>
              </button>
            )}

            {onOpenAiMenuImport && (
              <button
                type="button"
                onClick={onOpenAiMenuImport}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs border border-amber-600/30 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-stone-950" />
                <span>✨ AI Menu Import</span>
              </button>
            )}

            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controls Bar: Category Tabs, Dietary Filter, and Search */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="inline-flex items-center gap-1 p-1 bg-stone-100 rounded-xl overflow-x-auto">
          {['All', ...MENU_CATEGORIES].map((cat) => {
            const active = selectedCategory === cat;
            const count =
              cat === 'All'
                ? menuItems.length
                : menuItems.filter(
                    (i) =>
                      i.category === cat ||
                      (cat === 'Starters' && i.category === 'Appetizers')
                  ).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  active
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] font-mono-tabular ${
                    active ? 'text-stone-900 font-semibold' : 'text-stone-400'
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Dietary & Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dietary Filter */}
          <div className="inline-flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
            {['All', 'Veg', 'Non-Veg', 'Vegan'].map((diet) => (
              <button
                key={diet}
                type="button"
                onClick={() => setSelectedDietary(diet)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedDietary === diet
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {diet}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, drinks..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#FAF9F6] border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
        </div>
      </div>

      {/* Menu Item Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-3">
          <UtensilsCrossed className="w-8 h-8 text-stone-400 mx-auto" />
          <h3 className="text-base font-semibold text-stone-900">
            No dishes found
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try adjusting your search query, dietary filter, or category selection.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-xl hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Item</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const stockEval = evaluateDishStock(item, ingredients);
            const isAvailable = stockEval.isEffectivelyAvailable;

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition-colors ${
                  isAvailable
                    ? 'border-stone-200 hover:border-stone-300'
                    : 'border-rose-300 bg-rose-50/30'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top row: Category, Prominent Red Sold Out Badge & Dietary Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-stone-500 font-medium">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!isAvailable && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider shadow-2xs">
                          Sold Out
                        </span>
                      )}
                      {item.manualOverrideAvailable && !stockEval.isRecipeSufficient && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Override Active
                        </span>
                      )}
                      {renderDietaryBadge(item.dietary)}
                    </div>
                  </div>

                  {/* Title and Price */}
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-base font-semibold ${
                        !isAvailable ? 'text-stone-500 line-through' : 'text-stone-900'
                      }`}
                    >
                      {item.name}
                    </h3>
                    <span className="text-base font-bold font-mono-tabular text-stone-900 shrink-0">
                      {formatCurrency(item.price)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Recipe / Bill of Materials Strip */}
                  {stockEval.hasRecipe && (
                    <div className="pt-1.5">
                      <div
                        className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                          !stockEval.isRecipeSufficient
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-[#FAF9F6] border-stone-200 text-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1">
                            <Scale className="w-3 h-3 text-stone-500" />
                            <span>Recipe BOM ({item.recipe?.length} items)</span>
                          </span>
                          <span className="font-mono-tabular">
                            {stockEval.isRecipeSufficient
                              ? `${stockEval.maxServings} servings left`
                              : '0 servings (Depleted)'}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-500 truncate">
                          {(item.recipe || [])
                            .map((r) => {
                              const ing = ingredients.find(
                                (i) => i.id === r.ingredientId
                              );
                              return ing ? `${r.quantity}${r.unit} ${ing.name}` : '';
                            })
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                        {!stockEval.isRecipeSufficient && (
                          <div className="text-[10px] font-bold text-rose-700 flex items-center gap-1 pt-0.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>
                              Out of: {stockEval.missingIngredients.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Availability / Manual Override Toggle + Edit/Delete */}
                <div className="pt-4 mt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Primary 86 / Availability Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleAvailability(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                      }`}
                      title={
                        isAvailable
                          ? 'Click to 86 Dish (Mark Out of Stock)'
                          : 'Click to mark dish Available'
                      }
                    >
                      {isAvailable ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>In Stock · 86 Dish</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span className="font-semibold">86&apos;d (Sold Out)</span>
                        </>
                      )}
                    </button>

                    {/* Manual Override Toggle when Recipe is Depleted */}
                    {!stockEval.isRecipeSufficient && (
                      <button
                        type="button"
                        onClick={() =>
                          onToggleAvailability(
                            item.id,
                            !item.manualOverrideAvailable
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                          item.manualOverrideAvailable
                            ? 'bg-amber-500 text-stone-950 border-amber-600'
                            : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300'
                        }`}
                      >
                        {item.manualOverrideAvailable
                          ? '86 Dish'
                          : 'Mark Available anyway'}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      aria-label="Edit item and recipe"
                      title="Edit dish & recipe ingredients"
                      className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMenuItem(item.id)}
                      aria-label="Delete item"
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fast + Add / Edit Item & Recipe BOM Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-[#FAF9F6] border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UtensilsCrossed className="w-4 h-4 text-stone-800" />
                <h3 className="text-lg font-semibold text-stone-900">
                  {editingItem
                    ? 'Edit Dish & Recipe Mapping'
                    : '+ Add Menu Dish & Recipe'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="p-6 space-y-4 max-h-[82vh] overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Paneer Butter Masala"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MenuCategory)}
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                  >
                    {MENU_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-xl font-mono-tabular focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Dietary Classification *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Veg', 'Non-Veg', 'Vegan'] as DietaryType[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDietary(d)}
                      className={`py-2 text-xs font-medium rounded-xl border transition-colors ${
                        dietary === d
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Culinary Description &amp; Ingredients
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key ingredients, allergens, preparation notes..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              {/* Recipe Mapping (Bill of Materials) inside Menu Editor */}
              {ingredients.length > 0 && (
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-stone-700" />
                      <span>Dish Recipe Mapping (Bill of Materials)</span>
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Auto-deducts on order
                    </span>
                  </div>

                  {recipe.length > 0 && (
                    <div className="space-y-1.5">
                      {recipe.map((r) => {
                        const ing = ingredients.find(
                          (i) => i.id === r.ingredientId
                        );
                        return (
                          <div
                            key={r.ingredientId}
                            className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-stone-200 text-xs"
                          >
                            <span className="font-medium text-stone-800">
                              {ing?.name || r.ingredientId}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono-tabular font-bold text-stone-900">
                                {r.quantity} {r.unit}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveRecipeRow(r.ingredientId)
                                }
                                className="text-stone-400 hover:text-rose-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-2 items-end pt-1">
                    <div className="col-span-6">
                      <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
                        Ingredient
                      </label>
                      <select
                        value={selectedIngId}
                        onChange={(e) => {
                          setSelectedIngId(e.target.value);
                          const found = ingredients.find(
                            (i) => i.id === e.target.value
                          );
                          if (found) setIngUnit(found.unit);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                      >
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.currentStock} {i.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={ingQty}
                        onChange={(e) => setIngQty(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-3 flex items-center gap-1">
                      <select
                        value={ingUnit}
                        onChange={(e) =>
                          setIngUnit(e.target.value as MeasurementUnit)
                        }
                        className="w-full px-1.5 py-1.5 text-xs font-mono-tabular bg-white border border-stone-300 rounded-lg"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddRecipeRow}
                        className="px-2.5 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-lg shrink-0"
                      >
                        + Link
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Availability & Manual Override Settings */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="w-4 h-4 text-stone-900 rounded focus:ring-stone-900"
                  />
                  <span className="text-xs font-medium text-stone-800">
                    Currently Available (Uncheck to 86 Dish)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualOverrideAvailable}
                    onChange={(e) => {
                      setManualOverrideAvailable(e.target.checked);
                      if (e.target.checked) setIsAvailable(true);
                    }}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-600"
                  />
                  <span className="text-xs font-medium text-stone-700">
                    Mark Available anyway (Override automatic out-of-stock when recipe ingredients run low)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingItem ? 'Save Changes' : 'Add Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
