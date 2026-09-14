import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJSON } from "@/lib/utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  const { id } = await params;

  const meal = await prisma.mealItem.findUnique({
    where: { id },
    include: { mealPlan: true },
  });

  if (!meal) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "找不到该菜品" } }, { status: 404 });
  }

  // Verify ownership
  if (meal.mealPlan.userId !== session.user.id) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "无权访问" } }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...meal,
      ingredients: parseJSON(meal.ingredients, []),
      cookingSteps: parseJSON(meal.cookingSteps, []),
      nutrition: parseJSON(meal.nutrition, {}),
      alternatives: parseJSON(meal.alternatives, []),
      tags: parseJSON(meal.tags, []),
    },
  });
}
