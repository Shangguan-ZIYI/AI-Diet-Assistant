import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deepseek, AI_MODEL } from "@/lib/claude";
import { SURVEY_SYSTEM_PROMPT, buildSurveyPromptWithContext } from "@/lib/survey-prompts";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const messages: Array<{ role: "user" | "assistant"; content: string }> =
    body.messages ?? [];
  const profileContext = body.profileContext ?? null;

  if (messages.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "消息不能为空" } },
      { status: 400 }
    );
  }

  // Use context-aware prompt if profile data is provided
  const systemPrompt = profileContext
    ? buildSurveyPromptWithContext(profileContext)
    : SURVEY_SYSTEM_PROMPT;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const dsStream = await deepseek.chat.completions.create({
          model: AI_MODEL,
          max_tokens: 1024,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
        });

        for await (const chunk of dsStream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("Stream error:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "生成失败，请重试" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
