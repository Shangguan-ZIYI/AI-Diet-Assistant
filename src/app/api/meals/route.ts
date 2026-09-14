import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJSON, todayString } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? todayString();

  const plan = await prisma.mealPlan.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
    include: { meals: { orderBy: { createdAt: "asc" } } },
  });

  if (!plan) {
    return NextResponse.json({ success: true, data: null });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: plan.id,
      date: plan.date,
      generatedAt: plan.generatedAt,
      meals: plan.meals.map((m) => ({
        ...m,
        ingredients: parseJSON(m.ingredients, []),
        cookingSteps: parseJSON(m.cookingSteps, []),
        nutrition: parseJSON(m.nutrition, {}),
        alternatives: parseJSON(m.alternatives, []),
        tags: parseJSON(m.tags, []),
      })),
    },
  });
}
