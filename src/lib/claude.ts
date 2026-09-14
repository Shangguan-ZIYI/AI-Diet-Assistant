import OpenAI from "openai";

export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export const AI_MODEL = "deepseek-chat";

/** Single-turn structured JSON generation with retry */
export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  retries = 1
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await deepseek.chat.completions.create({
        model: AI_MODEL,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const text = response.choices[0]?.message?.content ?? "";

      // Extract JSON (model may wrap in markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON found in response");

      return JSON.parse(jsonMatch[0]) as T;
    } catch (err) {
      if (attempt === retries) throw err;
    }
  }
  throw new Error("generateJSON failed after retries");
}
