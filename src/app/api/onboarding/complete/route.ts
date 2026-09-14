import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const steps = body.steps ?? ["welcome", "privacy", "profile-setup"];

    await prisma.onboardingState.upsert({
      where: { userId: session.user.id },
      update: { surveyCompleted: true, currentStep: "complete", completedSteps: JSON.stringify(steps) },
      create: {
        userId: session.user.id,
        surveyCompleted: true,
        currentStep: "complete",
        completedSteps: JSON.stringify(steps),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[onboarding/complete] Error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: String(err) } },
      { status: 500 }
    );
  }
}
