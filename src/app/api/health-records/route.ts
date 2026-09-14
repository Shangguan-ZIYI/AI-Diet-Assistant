import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  const body = await req.json();

  const record = await prisma.healthRecord.create({
    data: {
      userId: session.user.id,
      recordDate: body.recordDate ?? new Date().toISOString().split("T")[0],
      weightKg: body.weightKg ?? null,
      bloodSugarMmol: body.bloodSugarMmol ?? null,
      bloodPressureSys: body.bloodPressureSys ?? null,
      bloodPressureDia: body.bloodPressureDia ?? null,
      note: body.note ?? null,
    },
  });

  return NextResponse.json({ success: true, data: record }, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  const records = await prisma.healthRecord.findMany({
    where: { userId: session.user.id },
    orderBy: { recordDate: "desc" },
    take: 30,
  });

  return NextResponse.json({ success: true, data: records });
}
