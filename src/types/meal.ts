export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface CookingStep {
  step: number;
  description: string;
}

export interface NutritionInfo {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
}

/** A single dish within a meal (主菜/配菜/汤/主食) */
export interface DishItem {
  dishName: string;
  role: string; // "主菜" | "配菜" | "汤" | "主食"
  cookMethod?: string;
  ingredients: Ingredient[];
  steps: CookingStep[];
}

/** A complete meal (整顿饭) — replaces the old single-dish MealItemData */
export interface MealItemData {
  id: string;
  slot: string;
  // New: whole-meal fields
  dishName: string; // mealTitle (kept as dishName for DB compat)
  mealStructure?: string; // e.g. "两菜一汤配米饭"
  recommendReason: string;
  imageUrl?: string | null;
  cookTimeMinutes?: number | null;
  difficulty?: string | null;
  servings: number;
  // New: multi-dish structure
  dishes?: DishItem[];
  // Legacy compat: flat ingredients/steps (for meals without dishes[])
  ingredients: Ingredient[];
  cookingSteps: CookingStep[];
  nutrition: NutritionInfo;
  tasteTags?: string[];
  alternatives: AlternativeMeal[];
  tags: string[];
  createdAt: string;
}

/** Alternative meal summary (not full detail in MVP) */
export interface AlternativeMeal {
  mealTitle: string;
  mealStructure?: string;
  reason: string;
  difference?: string;
  nutrition?: NutritionInfo;
  // Legacy compat fields
  dishName?: string;
  tags?: string[];
  difficulty?: string;
  cookTimeMinutes?: number;
}

export interface MealPlanData {
  id: string;
  date: string;
  generatedAt: string;
  meals: MealItemData[];
}

export interface DailyNutrition {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  targetCalories: number;
}
