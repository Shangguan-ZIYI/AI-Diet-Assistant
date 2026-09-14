import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0].message } },
        { status: 400 }
      );
    }

    const { identifier, password, name } = parsed.data;

    // Determine if phone or email
    const isPhone = /^1[3-9]\d{9}$/.test(identifier);
    const phone = isPhone ? identifier : null;
    const email = isPhone ? null : identifier;

    // Check existing
    const existing = await prisma.user.findFirst({
      where: { OR: [phone ? { phone } : {}, email ? { email } : {}].filter(Boolean) as { phone?: string; email?: string }[] },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE", message: isPhone ? "该手机号已注册" : "该邮箱已注册" } },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        phone,
        email,
        passwordHash,
        name: name ?? (isPhone ? `用户${identifier.slice(-4)}` : identifier.split("@")[0]),
        onboardingState: {
          create: {
            currentStep: "profile-setup",
            completedSteps: JSON.stringify(["welcome", "privacy"]),
          },
        },
      },
      select: { id: true, name: true, phone: true, email: true },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "注册失败，请稍后重试" } },
      { status: 500 }
    );
  }
}
