"use client";

import { useState, useCallback, useRef } from "react";
import {
  extractSurveyResult,
  extractHardConstraints,
  getQuickReplySuggestions,
  type SurveyMessage,
  type SurveyResult,
} from "@/lib/survey-prompts";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAiChat(mode: "initial" | "update" = "initial", profileContext?: Record<string, any> | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [extractedResult, setExtractedResult] = useState<SurveyResult | null>(null);
  const [hardConstraints, setHardConstraints] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userText: string) => {
    if (isStreaming) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userText },
    ];
    setMessages(newMessages);
    setQuickReplies([]);
    setIsStreaming(true);

    const assistantIdx = newMessages.length;
    setMessages([...newMessages, { role: "assistant", content: "", isStreaming: true }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })) as SurveyMessage[],
          profileContext: profileContext ?? null,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantIdx] = {
                  role: "assistant",
                  content: fullText,
                  isStreaming: true,
                };
                return updated;
              });
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      // Finalize message
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIdx] = { role: "assistant", content: fullText };
        return updated;
      });

      // Check for hard constraints
      const newConstraints = extractHardConstraints(fullText);
      if (newConstraints.length > 0) {
        setHardConstraints((prev) => [...prev, ...newConstraints]);
      }

      // Check if survey is complete
      const result = extractSurveyResult(fullText);
      if (result) {
        // Merge any hard constraints mentioned during chat into avoidIngredients
        const allConstraints = [...hardConstraints, ...newConstraints];
        if (allConstraints.length > 0) {
          result.avoidIngredients = [
            ...new Set([...(result.avoidIngredients ?? []), ...allConstraints]),
          ];
        }
        setExtractedResult(result);
      } else {
        const chips = getQuickReplySuggestions(fullText);
        setQuickReplies(chips);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("Chat error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIdx] = {
          role: "assistant",
          content: "抱歉，出现了一点问题。请重试。",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming, hardConstraints]);

  const startSurvey = useCallback(() => {
    sendMessage("你好，我想开始设置饮食偏好");
  }, [sendMessage]);

  return {
    messages,
    isStreaming,
    quickReplies,
    extractedResult,
    mode,
    sendMessage,
    startSurvey,
  };
}
