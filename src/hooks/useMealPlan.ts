"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { todayString } from "@/lib/utils";
import type { MealPlanData } from "@/types/meal";

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((d) => d.data);

export function useTodayMealPlan() {
  const date = todayString();
  const key = `/api/meals?date=${date}`;
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR<MealPlanData | null>(key, fetcher, {
    revalidateOnFocus: false,
  });

  async function generatePlan(force = false) {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, force }),
      });

      const text = await res.text();
      if (!text) {
        setGenerateError("服务器返回空响应，请稍后重试");
        return;
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        setGenerateError("服务器响应格式异常，请稍后重试");
        return;
      }

      if (json.success) {
        mutate(key, json.data, false);
      } else {
        setGenerateError(json.error?.message ?? "生成失败，请稍后重试");
      }
      return json;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "网络错误，请检查连接后重试";
      setGenerateError(msg);
      console.error("Generate plan error:", err);
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    plan: data,
    isLoading,
    isGenerating,
    generateError,
    error,
    generatePlan,
    date,
  };
}

export function useMealItem(id: string) {
  return useSWR(id ? `/api/meals/${id}` : null, fetcher);
}
