import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeJSON, parseJSON } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    );
  }

  const reminders = await prisma.reminder.findMany({
    where: { userId: session.user.id },
    orderBy: { slot: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: reminders.map((r) => ({
      ...r,
      days: parseJSON<number[]>(r.days, [0, 1, 2, 3, 4, 5, 6]),
    })),
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
  const reminders: Array<{
    slot: string;
    timeHHMM: string;
    enabled: boolean;
  }> = body.reminders ?? [];

  // Upsert each reminder
  const results = await Promise.all(
    reminders.map((r) =>
      prisma.reminder.upsert({
        where: {
          // Use a composite lookup: find by userId + slot
          id: `${session.user.id}-${r.slot}`,
        },
        update: {
          timeHHMM: r.timeHHMM,
          enabled: r.enabled,
        },
        create: {
          id: `${session.user.id}-${r.slot}`,
          userId: session.user.id,
          slot: r.slot,
          timeHHMM: r.timeHHMM,
          enabled: r.enabled,
          days: serializeJSON([0, 1, 2, 3, 4, 5, 6]),
        },
      })
    )
  );

  return NextResponse.json({
    success: true,
    data: results.map((r) => ({
      ...r,
      days: parseJSON<number[]>(r.days, [0, 1, 2, 3, 4, 5, 6]),
    })),
  });
}
