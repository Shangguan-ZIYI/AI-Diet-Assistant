import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MealFeedbackSchema } from "@/lib/validations";
import { generateJSON } from "@/lib/claude";
import { buildSwapMealPrompt } from "@/lib/meal-prompts";
import { parseJSON, serializeJSON } from "@/lib/utils";
import { getUserProfile } from "@/lib/user-profile";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json();
  const parsed = MealFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message } },
      { status: 400 }
    );
  }

  const meal = await prisma.mealItem.findUnique({
    where: { id },
    include: { mealPlan: { include: { meals: true } } },
  });

  if (!meal || meal.mealPlan.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "找不到该菜品" } }, { status: 404 });
  }

  // Save feedback
  await prisma.mealFeedback.create({
    data: {
      userId: session.user.id,
      mealId: id,
      type: parsed.data.type,
      note: parsed.data.note,
    },
  });

  // If negative feedback, generate a replacement meal
  if (parsed.data.type === "swap" || parsed.data.type === "dislike" || parsed.data.type === "too_complex" || parsed.data.type === "too_expensive") {
    // Fetch unified profile (single source of truth)
    const userProfile = await getUserProfile(session.user.id);
    if (!userProfile) {
      return NextResponse.json({ success: true, data: { feedback: "saved" } });
    }

    const { healthCtx, dietCtx } = userProfile;

    const feedbackLabels: Record<string, string> = {
      dislike: "不喜欢这道菜",
      too_complex: "太复杂了，做不来",
      too_expensive: "食材太贵了",
      swap: "想换一道菜",
    };

    const { system, user } = buildSwapMealPrompt(
      { health: healthCtx, diet: dietCtx, date: meal.mealPlan.date },
      meal.slot as "breakfast" | "lunch" | "dinner",
      meal.dishName,
      feedbackLabels[parsed.data.type] ?? parsed.data.type
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newMeal = await generateJSON<any>(system, user);

      // Update the meal item
      const updated = await prisma.mealItem.update({
        where: { id },
        data: {
          dishName: newMeal.dishName,
          recommendReason: newMeal.recommendReason,
          cookTimeMinutes: newMeal.cookTimeMinutes,
          difficulty: newMeal.difficulty,
          ingredients: serializeJSON(newMeal.ingredients),
          cookingSteps: serializeJSON(newMeal.cookingSteps),
          nutrition: serializeJSON(newMeal.nutrition),
          alternatives: serializeJSON(newMeal.alternatives ?? []),
          tags: serializeJSON(newMeal.tags ?? []),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          feedback: "saved",
          newMeal: {
            ...updated,
            ingredients: parseJSON(updated.ingredients, []),
            cookingSteps: parseJSON(updated.cookingSteps, []),
            nutrition: parseJSON(updated.nutrition, {}),
            alternatives: parseJSON(updated.alternatives, []),
            tags: parseJSON(updated.tags, []),
          },
        },
      });
    } catch (err) {
      console.error("Swap meal generation failed:", err);
    }
  }

  return NextResponse.json({ success: true, data: { feedback: "saved" } });
}
