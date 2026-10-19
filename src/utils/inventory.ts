import { Ingredient, MeasurementUnit, MenuItem, RecipeIngredientItem } from '../types';

/**
 * Convert a quantity from `fromUnit` to `toUnit`.
 * Supports g <-> kg and ml <-> L conversions seamlessly.
 */
export const convertUnitQuantity = (
  quantity: number,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit
): number => {
  if (fromUnit === toUnit) return quantity;
  if (fromUnit === 'g' && toUnit === 'kg') return quantity / 1000;
  if (fromUnit === 'kg' && toUnit === 'g') return quantity * 1000;
  if (fromUnit === 'ml' && toUnit === 'L') return quantity / 1000;
  if (fromUnit === 'L' && toUnit === 'ml') return quantity * 1000;
  return quantity;
};

export interface DishStockEvaluation {
  hasRecipe: boolean;
  isRecipeSufficient: boolean;
  isEffectivelyAvailable: boolean;
  isAuto86d: boolean;
  maxServings: number | null;
  missingIngredients: string[];
  lowStockIngredients: string[];
  recipeFoodCost: number;
}

/**
 * Evaluates a dish's Bill of Materials (recipe) against current raw ingredient inventory.
 */
export const evaluateDishStock = (
  dish: MenuItem,
  ingredients: Ingredient[]
): DishStockEvaluation => {
  const recipe = dish.recipe || [];
  if (recipe.length === 0) {
    return {
      hasRecipe: false,
      isRecipeSufficient: true,
      isEffectivelyAvailable: dish.isAvailable,
      isAuto86d: false,
      maxServings: null,
      missingIngredients: [],
      lowStockIngredients: [],
      recipeFoodCost: 0,
    };
  }

  let minServings = Infinity;
  const missingIngredients: string[] = [];
  const lowStockIngredients: string[] = [];
  let recipeFoodCost = 0;

  for (const req of recipe) {
    const ing = ingredients.find((i) => i.id === req.ingredientId);
    if (!ing) continue;

    // Convert required quantity into the ingredient's base unit
    const requiredInIngUnit = convertUnitQuantity(req.quantity, req.unit, ing.unit);
    recipeFoodCost += requiredInIngUnit * ing.costPerUnit;

    if (requiredInIngUnit <= 0) continue;

    const possibleServings = Math.floor(ing.currentStock / requiredInIngUnit);
    if (possibleServings < minServings) {
      minServings = possibleServings;
    }

    if (ing.currentStock <= 0 || ing.currentStock < requiredInIngUnit) {
      missingIngredients.push(ing.name);
    } else if (ing.currentStock <= ing.minThreshold) {
      lowStockIngredients.push(ing.name);
    }
  }

  const isRecipeSufficient = missingIngredients.length === 0;
  const isAuto86d = !isRecipeSufficient && !dish.manualOverrideAvailable;
  const isEffectivelyAvailable = dish.manualOverrideAvailable
    ? dish.isAvailable
    : dish.isAvailable && isRecipeSufficient;

  return {
    hasRecipe: true,
    isRecipeSufficient,
    isEffectivelyAvailable,
    isAuto86d,
    maxServings: minServings === Infinity ? null : Math.max(0, minServings),
    missingIngredients,
    lowStockIngredients,
    recipeFoodCost: Math.round(recipeFoodCost * 100) / 100,
  };
};

/**
 * Synchronizes `MenuItem.isAvailable` flags whenever ingredient stocks change.
 * - If an item's recipe lacks stock and `manualOverrideAvailable` is not true, sets `isAvailable = false`.
 */
export const syncMenuAvailabilityWithInventory = (
  menuItems: MenuItem[],
  ingredients: Ingredient[]
): MenuItem[] => {
  return menuItems.map((item) => {
    if (!item.recipe || item.recipe.length === 0) return item;
    const evalResult = evaluateDishStock(item, ingredients);
    if (!evalResult.isRecipeSufficient && !item.manualOverrideAvailable) {
      if (item.isAvailable) {
        return { ...item, isAvailable: false };
      }
    }
    return item;
  });
};
