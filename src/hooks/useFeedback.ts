"use client";

import { useState } from "react";
import { mutate } from "swr";

export function useFeedback(mealId: string) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  async function submitFeedback(
    type: "ate" | "dislike" | "too_complex" | "too_expensive" | "swap",
    note?: string
  ) {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/meals/${mealId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, note }),
      });
      const data = await res.json();

      if (data.success) {
        setSubmitted(type);
        if (data.data?.newMeal) {
          // Revalidate the meal detail
          mutate(`/api/meals/${mealId}`, { success: true, data: data.data.newMeal }, false);
        }
        return data.data;
      }
    } finally {
      setLoading(false);
    }
  }

  return { submitFeedback, loading, submitted };
}
