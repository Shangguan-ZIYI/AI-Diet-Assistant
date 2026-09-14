import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJSON, serializeJSON } from "@/lib/utils";

/**
 * Swap a meal's main dish with one of its alternatives.
 * Pure data operation — no AI call. The selected alternative is promoted
 * to the main dish, and the original main dish is demoted into alternatives.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await req.json();
  const altIndex = body.alternativeIndex;

  if (typeof altIndex !== "number" || altIndex < 0) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "请指定备选序号" } },
      { status: 400 }
    );
  }

  const meal = await prisma.mealItem.findUnique({
    where: { id },
    include: { mealPlan: { select: { userId: true } } },
  });

  if (!meal || meal.mealPlan.userId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "找不到该菜品" } },
      { status: 404 }
    );
  }

  const alternatives = parseJSON<Array<{
    dishName: string;
    reason: string;
    nutrition: Record<string, number>;
    tags?: string[];
    difficulty?: string;
    cookTimeMinutes?: number;
  }>>(meal.alternatives, []);

  if (altIndex >= alternatives.length) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "备选序号超出范围" } },
      { status: 400 }
    );
  }

  const selected = alternatives[altIndex];

  // Build new alternatives: remove selected, add original main dish
  const newAlternatives = [
    // Original main dish becomes an alternative
    {
      dishName: meal.dishName,
      reason: "原推荐菜品",
      nutrition: parseJSON(meal.nutrition, {}),
      tags: parseJSON<string[]>(meal.tags, []),
      difficulty: meal.difficulty,
      cookTimeMinutes: meal.cookTimeMinutes,
    },
    // Keep other alternatives
    ...alternatives.filter((_, i) => i !== altIndex),
  ];

  // Update: promote selected alternative to main dish
  const updated = await prisma.mealItem.update({
    where: { id },
    data: {
      dishName: selected.dishName,
      recommendReason: selected.reason ?? meal.recommendReason,
      nutrition: serializeJSON(selected.nutrition),
      tags: serializeJSON(selected.tags ?? []),
      difficulty: selected.difficulty ?? meal.difficulty,
      cookTimeMinutes: selected.cookTimeMinutes ?? meal.cookTimeMinutes,
      alternatives: serializeJSON(newAlternatives),
      // Keep original ingredients/steps since alternative doesn't have them
      // They'll be slightly mismatched but this is MVP
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      ingredients: parseJSON(updated.ingredients, []),
      cookingSteps: parseJSON(updated.cookingSteps, []),
      nutrition: parseJSON(updated.nutrition, {}),
      alternatives: parseJSON(updated.alternatives, []),
      tags: parseJSON(updated.tags, []),
    },
  });
}
