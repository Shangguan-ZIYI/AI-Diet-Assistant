import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function serializeJSON(value: unknown): string {
  return JSON.stringify(value);
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function todayString(): string {
  return formatDate(new Date());
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "早上好";
  if (hour >= 12 && hour < 14) return "中午好";
  if (hour >= 14 && hour < 18) return "下午好";
  return "晚上好";
}

export function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "春季";
  if (month >= 6 && month <= 8) return "夏季";
  if (month >= 9 && month <= 11) return "秋季";
  return "冬季";
}

export function getMealSlotLabel(slot: string): string {
  const labels: Record<string, string> = {
    breakfast: "早餐",
    lunch: "午餐",
    dinner: "晚餐",
    snack: "加餐",
  };
  return labels[slot] ?? slot;
}

export function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: "简单",
    medium: "中等",
    hard: "较难",
  };
  return labels[difficulty] ?? difficulty;
}
