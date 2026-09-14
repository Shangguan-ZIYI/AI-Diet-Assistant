"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { cn, getMealSlotLabel, todayString } from "@/lib/utils";
import type { MealItemData, AlternativeMeal } from "@/types/meal";

interface MealSlotCardProps {
  slot: string;
  meal?: MealItemData;
  loading?: boolean;
}

const SLOT_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

const SLOT_COLORS: Record<string, string> = {
  breakfast: "from-amber-50 to-orange-50 border-amber-100",
  lunch: "from-primary-50 to-teal-50 border-primary-100",
  dinner: "from-indigo-50 to-purple-50 border-indigo-100",
  snack: "from-green-50 to-emerald-50 border-green-100",
};

function DifficultyBadge({ difficulty }: { difficulty?: string | null }) {
  if (!difficulty) return null;
  return (
    <span className={cn(
      "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
      difficulty === "easy" ? "bg-green-100 text-green-700" :
      difficulty === "medium" ? "bg-amber-100 text-amber-700" :
      "bg-red-100 text-red-700"
    )}>
      {difficulty === "easy" ? "简单" : difficulty === "medium" ? "中等" : "较难"}
    </span>
  );
}

function TagList({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.slice(0, 4).map((tag) => (
        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 text-warm-600">
          {tag}
        </span>
      ))}
    </div>
  );
}

/** Split "土豆牛肉配米饭和清炒菠菜" into main + sub title */
function splitDishName(name: string): { main: string; sub: string | null } {
  // Try splitting on common Chinese meal separators
  const patterns = [/配(.+)$/, /搭配(.+)$/, /和(.+)$/, /\+(.+)$/];
  for (const pat of patterns) {
    const match = name.match(pat);
    if (match && match.index && match.index > 2) {
      return { main: name.slice(0, match.index).trim(), sub: match[1].trim() };
    }
  }
  return { main: name, sub: null };
}

export function MealSlotCard({ slot, meal, loading }: MealSlotCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [swapping, setSwapping] = useState(false);

  const alternatives = meal?.alternatives?.slice(0, 3) ?? [];
  const totalSlides = 1 + alternatives.length;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIdx(Math.min(idx, totalSlides - 1));
  }, [totalSlides]);

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }, []);

  async function handleSwapAlternative(altIndex: number) {
    if (!meal || swapping) return;
    setSwapping(true);
    try {
      const res = await fetch(`/api/meals/${meal.id}/swap-alternative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alternativeIndex: altIndex }),
      });
      const json = await res.json();
      if (json.success) {
        // Revalidate the meal plan to update all cards
        mutate(`/api/meals?date=${todayString()}`);
        // Scroll back to main dish
        scrollTo(0);
      }
    } catch (err) {
      console.error("Swap alternative error:", err);
    } finally {
      setSwapping(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-warm-100 bg-white p-4 animate-pulse">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 rounded-full bg-warm-100" />
          <div className="h-4 w-16 rounded bg-warm-100" />
        </div>
        <div className="h-5 w-32 rounded bg-warm-100 mb-1" />
        <div className="h-3 w-20 rounded bg-warm-100" />
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="rounded-2xl border border-dashed border-warm-200 bg-warm-50 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{SLOT_ICONS[slot] ?? "🍽️"}</span>
          <span className="text-sm font-medium text-warm-500">{getMealSlotLabel(slot)}</span>
        </div>
        <p className="text-xs text-warm-400">暂无推荐，点击生成</p>
      </div>
    );
  }

  const cardClass = cn(
    "rounded-2xl border bg-gradient-to-br",
    SLOT_COLORS[slot] ?? "from-warm-50 to-warm-100 border-warm-200"
  );

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-3"
      >
        {/* Main dish card — links to detail page */}
        <Link
          href={`/meal/${meal.id}`}
          className="snap-start flex-shrink-0 block"
          style={{ width: "100%" }}
        >
          <div className={cn(cardClass, "p-4 transition-transform active:scale-[0.98]")}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{SLOT_ICONS[slot] ?? "🍽️"}</span>
                <span className="text-xs font-medium text-warm-500">{getMealSlotLabel(slot)}</span>
                {alternatives.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-600 font-medium">推荐</span>
                )}
              </div>
              <svg className="h-3 w-3 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {(() => {
              const { main, sub } = splitDishName(meal.dishName);
              return (
                <>
                  <h3 className="text-base font-semibold text-warm-900 mb-0.5">{main}</h3>
                  {sub && <p className="text-xs text-warm-500 mb-1">配{sub}</p>}
                </>
              );
            })()}

            <div className="flex items-center gap-3 text-xs text-warm-500">
              {meal.nutrition?.calories && (
                <span className="flex items-center gap-1">
                  <span className="text-[10px]">🔥</span>
                  {meal.nutrition.calories} kcal
                </span>
              )}
              {meal.cookTimeMinutes && (
                <span className="flex items-center gap-1">
                  <span className="text-[10px]">⏱</span>
                  {meal.cookTimeMinutes} 分钟
                </span>
              )}
              <DifficultyBadge difficulty={meal.difficulty} />
            </div>

            <TagList tags={meal.tags} />
          </div>
        </Link>

        {/* Alternative cards — click to swap (promote to main dish) */}
        {alternatives.map((alt: AlternativeMeal, i: number) => (
          <button
            key={i}
            onClick={() => handleSwapAlternative(i)}
            disabled={swapping}
            className="snap-start flex-shrink-0 block text-left"
            style={{ width: "100%" }}
          >
            <div className={cn(cardClass, "p-4 transition-transform active:scale-[0.98]", swapping && "opacity-60")}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{SLOT_ICONS[slot] ?? "🍽️"}</span>
                  <span className="text-xs font-medium text-warm-500">{getMealSlotLabel(slot)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warm-100 text-warm-500 font-medium">备选 {i + 1}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-600 font-medium">
                  {swapping ? "切换中…" : "点击切换"}
                </span>
              </div>

              {(() => {
                const { main, sub } = splitDishName(alt.mealTitle ?? alt.dishName ?? "备选方案");
                return (
                  <>
                    <h3 className="text-base font-semibold text-warm-900 mb-0.5">{main}</h3>
                    {sub && <p className="text-xs text-warm-500 mb-1">配{sub}</p>}
                  </>
                );
              })()}

              <div className="flex items-center gap-3 text-xs text-warm-500">
                {alt.nutrition?.calories && (
                  <span className="flex items-center gap-1">
                    <span className="text-[10px]">🔥</span>
                    {alt.nutrition.calories} kcal
                  </span>
                )}
                {alt.cookTimeMinutes && (
                  <span className="flex items-center gap-1">
                    <span className="text-[10px]">⏱</span>
                    {alt.cookTimeMinutes} 分钟
                  </span>
                )}
                <DifficultyBadge difficulty={alt.difficulty} />
              </div>

              <TagList tags={alt.tags} />
            </div>
          </button>
        ))}
      </div>

      {/* Dot indicators */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={cn(
                "rounded-full transition-all",
                i === activeIdx
                  ? "w-4 h-1.5 bg-primary-500"
                  : "w-1.5 h-1.5 bg-warm-300"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
