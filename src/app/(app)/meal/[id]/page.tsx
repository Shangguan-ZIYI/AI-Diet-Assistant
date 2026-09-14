"use client";

import { use, useState } from "react";
import { useMealItem } from "@/hooks/useMealPlan";
import { useFeedback } from "@/hooks/useFeedback";
import { TopBar } from "@/components/layout/TopBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { TagChip } from "@/components/shared/TagChip";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { getDifficultyLabel } from "@/lib/utils";
import type { Ingredient, CookingStep, DishItem } from "@/types/meal";
import { cn } from "@/lib/utils";

function CollapsibleSection({ title, defaultOpen = false, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-3"
      >
        <h2 className="text-base font-semibold text-warm-900">{title}</h2>
        <svg
          className={cn("h-4 w-4 text-warm-400 transition-transform", open && "rotate-180")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && children}
    </div>
  );
}

export default function MealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: meal, isLoading } = useMealItem(id);
  const { submitFeedback, loading: feedbackLoading, submitted } = useFeedback(id);

  if (isLoading) return <PageLoader />;
  if (!meal) return (
    <>
      <TopBar title="菜品详情" showBack />
      <PageContainer>
        <div className="rounded-2xl bg-warm-50 border border-warm-100 p-6 text-center mt-8">
          <p className="text-sm text-warm-500">找不到该菜品</p>
        </div>
      </PageContainer>
    </>
  );

  // Split dish name into main + sub
  const dishName = meal.dishName ?? "菜品";
  const nameParts = dishName.match(/^(.+?)(?:配|搭配|和|\+)(.+)$/);
  const mainName = nameParts ? nameParts[1].trim() : dishName;
  const subName = nameParts ? nameParts[2].trim() : null;

  return (
    <>
      <TopBar title={mainName} showBack />
      <PageContainer>
        {/* Hero */}
        <div className="mb-5 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-100 to-teal-50 h-40 flex items-center justify-center">
          <span className="text-6xl">🍽️</span>
        </div>

        {/* Title + Tags */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-warm-900">{mainName}</h1>
          {subName && <p className="text-sm text-warm-500 mt-1">配{subName}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {meal.difficulty && (
              <TagChip label={getDifficultyLabel(meal.difficulty)} variant={meal.difficulty === "easy" ? "success" : "warning"} />
            )}
            {meal.cookTimeMinutes && (
              <TagChip label={`${meal.cookTimeMinutes} 分钟`} />
            )}
            {meal.tags?.map((tag: string) => (
              <TagChip key={tag} label={tag} variant="primary" />
            ))}
          </div>
        </div>

        {/* Recommend reason — always expanded */}
        {meal.recommendReason && (
          <div className="mb-5 rounded-2xl bg-primary-50 border border-primary-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
                <span className="text-white text-[10px] font-bold">健</span>
              </div>
              <span className="text-xs font-semibold text-primary-700">为什么推荐这道菜？</span>
            </div>
            <p className="text-sm text-primary-800 leading-relaxed">{meal.recommendReason}</p>
          </div>
        )}

        {/* Nutrition — always expanded */}
        {meal.nutrition && (
          <div className="mb-5">
            <h2 className="text-base font-semibold text-warm-900 mb-3">营养信息</h2>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "热量", value: meal.nutrition.calories, unit: "kcal", color: "bg-orange-50 text-orange-700" },
                { label: "蛋白质", value: meal.nutrition.proteinG, unit: "g", color: "bg-blue-50 text-blue-700" },
                { label: "碳水", value: meal.nutrition.carbsG, unit: "g", color: "bg-amber-50 text-amber-700" },
                { label: "脂肪", value: meal.nutrition.fatG, unit: "g", color: "bg-pink-50 text-pink-700" },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className={cn("rounded-xl p-3 text-center", color)}>
                  <div className="text-lg font-bold">{value}</div>
                  <div className="text-[10px] mt-0.5">{unit}</div>
                  <div className="text-[11px] mt-0.5 opacity-80">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dishes — new multi-dish structure */}
        {meal.dishes && meal.dishes.length > 0 ? (
          meal.dishes.map((dish: DishItem, di: number) => (
            <CollapsibleSection key={di} title={`${dish.role ? `【${dish.role}】` : ""}${dish.dishName}`}>
              {/* Dish ingredients */}
              {dish.ingredients?.length > 0 && (
                <div className="rounded-2xl bg-white border border-warm-100 divide-y divide-warm-50 mb-3">
                  {dish.ingredients.map((item: Ingredient, i: number) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-warm-800">{item.name}</span>
                      <span className="text-sm text-warm-500">{item.amount}{item.unit}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Dish steps */}
              {dish.steps?.length > 0 && (
                <div className="space-y-3">
                  {dish.steps.map((step: CookingStep) => (
                    <div key={step.step} className="flex gap-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-bold">
                        {step.step}
                      </div>
                      <p className="text-sm text-warm-700 leading-relaxed pt-0.5">{step.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          ))
        ) : (
          <>
            {meal.ingredients?.length > 0 && (
              <CollapsibleSection title={`食材清单（${meal.ingredients.length}种）`}>
                <div className="rounded-2xl bg-white border border-warm-100 divide-y divide-warm-50">
                  {meal.ingredients.map((item: Ingredient, i: number) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-warm-800">{item.name}</span>
                      <span className="text-sm text-warm-500">{item.amount}{item.unit}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
            {meal.cookingSteps?.length > 0 && (
              <CollapsibleSection title={`烹饪步骤（${meal.cookingSteps.length}步）`}>
                <div className="space-y-3">
                  {meal.cookingSteps.map((step: CookingStep) => (
                    <div key={step.step} className="flex gap-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-bold">
                        {step.step}
                      </div>
                      <p className="text-sm text-warm-700 leading-relaxed pt-0.5">{step.description}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </>
        )}

        {/* Alternatives — clickable swap cards */}
        {meal.alternatives?.length > 0 && (
          <div className="mb-5">
            <h2 className="text-base font-semibold text-warm-900 mb-3">不喜欢？试试这些</h2>
            <div className="space-y-2">
              {meal.alternatives.map((alt: { mealTitle?: string; dishName?: string; reason: string; difference?: string; nutrition?: { calories: number } }, i: number) => (
                <button
                  key={i}
                  onClick={() => submitFeedback("swap")}
                  disabled={feedbackLoading || !!submitted}
                  className="w-full rounded-2xl bg-warm-50 border border-warm-100 px-4 py-3 flex items-center justify-between text-left hover:border-primary-200 hover:bg-primary-50 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-warm-900">{alt.mealTitle ?? alt.dishName ?? "备选方案"}</div>
                    <div className="text-xs text-warm-500 mt-0.5">{alt.difference ?? alt.reason}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {alt.nutrition?.calories && (
                      <span className="text-xs text-warm-400">{alt.nutrition.calories} kcal</span>
                    )}
                    <span className="text-xs text-primary-600 font-medium">换成这道</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback — regrouped */}
        <div className="mb-2">
          <h2 className="text-base font-semibold text-warm-900 mb-3">这道菜怎么样？</h2>
          {submitted === "ate" ? (
            <div className="rounded-2xl bg-primary-50 border border-primary-200 p-4 text-center">
              <div className="text-2xl mb-1">🎉</div>
              <p className="text-sm font-semibold text-primary-800">太棒了！记录成功</p>
            </div>
          ) : submitted ? (
            <div className="rounded-2xl bg-warm-50 border border-warm-200 p-4 text-center">
              <p className="text-sm text-warm-600">已收到您的反馈，下次会优化推荐</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* A: Completion */}
              <button
                onClick={() => submitFeedback("ate")}
                disabled={feedbackLoading}
                className="w-full rounded-xl py-3.5 bg-primary-500 text-white font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span>✓</span>
                <span>已经吃了</span>
              </button>

              {/* B: Negative feedback */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: "dislike" as const, icon: "👎", label: "不喜欢" },
                  { type: "too_complex" as const, icon: "😅", label: "太复杂" },
                  { type: "too_expensive" as const, icon: "💸", label: "太贵了" },
                ].map(({ type, icon, label }) => (
                  <button
                    key={type}
                    onClick={() => submitFeedback(type)}
                    disabled={feedbackLoading}
                    className="rounded-xl py-2.5 bg-warm-100 text-warm-700 text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    <span className="text-xs">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* C: Action — swap */}
              <button
                onClick={() => submitFeedback("swap")}
                disabled={feedbackLoading}
                className="w-full rounded-xl py-3 border border-amber-200 bg-amber-50 text-amber-700 font-medium text-sm transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>换一道菜</span>
              </button>
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
