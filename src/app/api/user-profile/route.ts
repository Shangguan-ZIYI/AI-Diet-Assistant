import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserProfileSchema } from "@/lib/validations";
import {
  getUserProfileRaw,
  upsertUserProfile,
  getProfileCompleteness,
} from "@/lib/user-profile";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    );
  }

  const profile = await getUserProfileRaw(session.user.id);

  if (!profile) {
    return NextResponse.json({
      success: true,
      data: null,
      completeness: { percentage: 0, missingCriticalFields: ["age", "gender", "heightCm", "weightKg"], missingSections: ["basicInfo", "healthMetrics", "dietaryRestrictions", "dietaryPreferences", "lifestyleContext", "healthGoals"] },
    });
  }

  return NextResponse.json({
    success: true,
    data: profile,
    completeness: getProfileCompleteness(profile),
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = UserProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0].message,
        },
      },
      { status: 400 }
    );
  }

  // Filter out undefined fields so we only update what was provided
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates[key] = value;
    }
  }

  const profile = await upsertUserProfile(session.user.id, updates);

  return NextResponse.json({
    success: true,
    data: profile,
    completeness: getProfileCompleteness(profile),
  });
}
