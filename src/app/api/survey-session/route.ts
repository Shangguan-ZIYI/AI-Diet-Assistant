import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeJSON } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    );
  }

  const latest = await prisma.surveySession.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: latest });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { messages, extractedResult, suggestedUpdates, appliedFields, status } =
    body;

  const record = await prisma.surveySession.create({
    data: {
      userId: session.user.id,
      messages: typeof messages === "string" ? messages : serializeJSON(messages ?? []),
      extractedResult: extractedResult
        ? typeof extractedResult === "string"
          ? extractedResult
          : serializeJSON(extractedResult)
        : null,
      suggestedUpdates: suggestedUpdates
        ? typeof suggestedUpdates === "string"
          ? suggestedUpdates
          : serializeJSON(suggestedUpdates)
        : null,
      appliedFields: appliedFields
        ? typeof appliedFields === "string"
          ? appliedFields
          : serializeJSON(appliedFields)
        : null,
      status: status ?? "completed",
    },
  });

  return NextResponse.json({ success: true, data: record });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { id, appliedFields, status } = body;

  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "缺少 session id" } },
      { status: 400 }
    );
  }

  const record = await prisma.surveySession.update({
    where: { id },
    data: {
      appliedFields: appliedFields
        ? typeof appliedFields === "string"
          ? appliedFields
          : serializeJSON(appliedFields)
        : undefined,
      status: status ?? "applied",
    },
  });

  return NextResponse.json({ success: true, data: record });
}
