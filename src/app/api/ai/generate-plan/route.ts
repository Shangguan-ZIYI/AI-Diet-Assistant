import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateJSON } from "@/lib/claude";
import {
  buildSingleMealPrompt,
  MealGenerationContext,
  GeneratedMealSummary,
} from "@/lib/meal-prompts";
import { checkAllergenInText } from "@/lib/safety";
import { parseJSON, serializeJSON, todayString } from "@/lib/utils";
import { getUserProfile } from "@/lib/user-profile";
import type { MealItemData } from "@/types/meal";

/** Shape returned by AI for the new "whole meal" structure */
interface GeneratedMeal {
  mealTitle: string;
  mealType?: string;
  servings?: number;
  mealStructure?: string;
  recommendReason: string;
  mainProtein?: string;
  mainCookMethod?: string;
  mainTaste?: string;
  dishes?: Array<{
    dishName: string;
    role: string;
    cookMethod?: string;
    ingredients: Array<{ name: string; amount: string; unit: string }>;
    steps: Array<{ step: number; description: string }>;
  }>;
  nutrition: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG?: number;
  };
  tasteTags?: string[];
  alternatives?: Array<{
    mealTitle: string;
    mealStructure?: string;
    reason: string;
    difference?: string;
  }>;
  // Legacy compat: AI might still output these
  dishName?: string;
  difficulty?: string;
  cookTimeMinutes?: number;
  ingredients?: Array<{ name: string; amount: string; unit: string }>;
  cookingSteps?: Array<{ step: number; description: string }>;
  tags?: string[];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const date = body.date ?? todayString();
  const force = body.force === true;

  const existing = await prisma.mealPlan.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
    include: { meals: true },
  });

  if (existing) {
    if (!force) {
      return NextResponse.json({ success: true, data: formatPlan(existing) });
    }
    await prisma.mealPlan.delete({ where: { id: existing.id } });
  }

  const userProfile = await getUserProfile(session.user.id);
  if (!userProfile) {
    return NextResponse.json(
      { success: false, error: { code: "NO_PROFILE", message: "请先完成健康档案" } },
      { status: 400 }
    );
  }

  const { healthCtx, dietCtx } = userProfile;
  const ctx: MealGenerationContext = { health: healthCtx, diet: dietCtx, date };

  // Serial generation: breakfast → lunch → dinner
  // Each step passes previous meals as dedup context
  const previousMeals: GeneratedMealSummary[] = [];
  const results: Record<string, GeneratedMeal> = {};

  for (const slot of ["breakfast", "lunch", "dinner"] as const) {
    try {
      const { system, user } = buildSingleMealPrompt(ctx, slot, previousMeals);
      const meal = await generateJSON<GeneratedMeal>(system, user);
      results[slot] = meal;

      // Extract summary for dedup in next slot
      previousMeals.push({
        slot,
        mealTitle: meal.mealTitle ?? meal.dishName ?? "未知",
        mainProtein: meal.mainProtein ?? "未知",
        mainCookMethod: meal.mainCookMethod ?? "未知",
        mainTaste: meal.mainTaste ?? "未知",
      });
    } catch (err) {
      console.error(`Meal generation failed for ${slot}:`, err);
      return NextResponse.json(
        { success: false, error: { code: "AI_ERROR", message: `${slot}推荐生成失败，请稍后重试` } },
        { status: 500 }
      );
    }
  }

  // Post-validate: check allergens + forbidden ingredients
  const allForbidden = [...healthCtx.allergies, ...healthCtx.forbiddenIngredients];
  for (const slot of ["breakfast", "lunch", "dinner"] as const) {
    const meal = results[slot];
    // Check in dishes (new format)
    if (meal.dishes) {
      for (const dish of meal.dishes) {
        const ingredientText = dish.ingredients.map((i) => i.name).join(" ");
        const found = checkAllergenInText(ingredientText, allForbidden);
        if (found.length > 0) {
          console.warn(`Forbidden ingredient in ${slot}/${dish.dishName}: ${found.join(", ")}`);
          dish.ingredients = dish.ingredients.filter(
            (i) => !found.some((a) => i.name.includes(a))
          );
        }
      }
    }
    // Check in flat ingredients (legacy compat)
    if (meal.ingredients) {
      const ingredientText = meal.ingredients.map((i) => i.name).join(" ");
      const found = checkAllergenInText(ingredientText, allForbidden);
      if (found.length > 0) {
        meal.ingredients = meal.ingredients.filter(
          (i) => !found.some((a) => i.name.includes(a))
        );
      }
    }
  }

  // Save to DB — normalize the new format into MealItem columns
  const mealPlan = await prisma.mealPlan.create({
    data: {
      userId: session.user.id,
      date,
      meals: {
        create: (["breakfast", "lunch", "dinner"] as const).map((slot) => {
          const meal = results[slot];
          // Flatten dishes into ingredients/steps for backward compatibility
          const allIngredients = meal.dishes
            ? meal.dishes.flatMap((d) => d.ingredients)
            : meal.ingredients ?? [];
          const allSteps = meal.dishes
            ? meal.dishes.flatMap((d) => d.steps)
            : meal.cookingSteps ?? [];
          const totalCookTime = meal.dishes
            ? undefined
            : meal.cookTimeMinutes;

          return {
            slot,
            dishName: meal.mealTitle ?? meal.dishName ?? "未知",
            recommendReason: meal.recommendReason ?? "",
            cookTimeMinutes: totalCookTime ?? null,
            difficulty: meal.difficulty ?? null,
            servings: meal.servings ?? dietCtx.usualDiningPeople,
            ingredients: serializeJSON(allIngredients),
            cookingSteps: serializeJSON(allSteps),
            nutrition: serializeJSON(meal.nutrition ?? {}),
            alternatives: serializeJSON(
              (meal.alternatives ?? []).map((alt) => ({
                dishName: alt.mealTitle,
                mealTitle: alt.mealTitle,
                mealStructure: alt.mealStructure,
                reason: alt.reason,
                difference: alt.difference,
                nutrition: meal.nutrition, // approximate
              }))
            ),
            tags: serializeJSON(meal.tasteTags ?? meal.tags ?? []),
          };
        }),
      },
    },
    include: { meals: true },
  });

  return NextResponse.json({ success: true, data: formatPlan(mealPlan) });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPlan(plan: any) {
  return {
    id: plan.id,
    date: plan.date,
    generatedAt: plan.generatedAt,
    meals: plan.meals.map(
      (
        m: MealItemData & {
          ingredients: string;
          cookingSteps: string;
          nutrition: string;
          alternatives: string;
          tags: string;
        }
      ) => ({
        ...m,
        ingredients: parseJSON(m.ingredients, []),
        cookingSteps: parseJSON(m.cookingSteps, []),
        nutrition: parseJSON(m.nutrition, {}),
        alternatives: parseJSON(m.alternatives, []),
        tags: parseJSON(m.tags, []),
      })
    ),
  };
}
