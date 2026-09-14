"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTodayMealPlan } from "@/hooks/useMealPlan";
import { MealSlotCard } from "@/components/home/MealSlotCard";
import { NutritionRing } from "@/components/home/NutritionRing";
import { PageContainer } from "@/components/layout/PageContainer";
import { TopBar } from "@/components/layout/TopBar";
import { getGreeting } from "@/lib/utils";
import type { MealItemData } from "@/types/meal";
import type { ProfileCompleteness } from "@/lib/user-profile";

const SLOTS = ["breakfast", "lunch", "dinner"];

interface ProfileState {
  loaded: boolean;
  hasProfile: boolean;
  completeness: ProfileCompleteness | null;
  targetCalories: number;
  preferencesEmpty: boolean; // true if taste/cuisine/cooking prefs are all empty
}

export default function HomePage() {
  const { data: session } = useSession();
  const { plan, isLoading, isGenerating, generateError, generatePlan } = useTodayMealPlan();

  const [profile, setProfile] = useState<ProfileState>({
    loaded: false,
    hasProfile: false,
    completeness: null,
    targetCalories: 2000,
    preferencesEmpty: false,
  });

  // Fetch profile completeness on mount
  useEffect(() => {
    fetch("/api/user-profile")
      .then((r) => r.json())
      .then((d) => {
        // Estimate target calories from profile if available
        let targetCal = 2000;
        if (d.data?.weightKg && d.data?.heightCm && d.data?.age) {
          const w = d.data.weightKg, h = d.data.heightCm, a = d.data.age;
          const bmr = d.data.gender === "female"
            ? 10 * w + 6.25 * h - 5 * a - 161
            : 10 * w + 6.25 * h - 5 * a + 5;
          const mult: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
          targetCal = Math.round(bmr * (mult[d.data.activityLevel ?? ""] ?? 1.2));
          if (d.data.targetWeightKg && d.data.targetWeightKg < w) {
            targetCal = Math.max(targetCal - 400, d.data.gender === "female" ? 1200 : 1500);
          }
        }
        const prefEmpty = d.data
          ? (!d.data.tastePref?.length && !d.data.cuisinePref?.length && !d.data.cookingAbility)
          : false;
        setProfile({
          loaded: true,
          hasProfile: !!d.data,
          completeness: d.completeness ?? null,
          targetCalories: targetCal,
          preferencesEmpty: !!prefEmpty,
        });
      })
      .catch(() => {
        setProfile({ loaded: true, hasProfile: false, completeness: null, targetCalories: 2000, preferencesEmpty: false });
      });
  }, []);

  // Auto-generate if: profile loaded, no critical fields missing, no plan yet
  const criticalMissing = profile.completeness?.missingCriticalFields ?? [];
  const missingSections = profile.completeness?.missingSections ?? [];
  const canGenerate = profile.loaded && criticalMissing.length === 0;

  useEffect(() => {
    if (profile.loaded && !isLoading && plan === null && canGenerate && !isGenerating && !generateError) {
      generatePlan();
    }
  }, [profile.loaded, isLoading, plan, canGenerate, isGenerating, generateError, generatePlan]);

  const totalCalories = plan?.meals.reduce(
    (sum: number, m: MealItemData) => sum + (m.nutrition?.calories ?? 0),
    0
  ) ?? 0;

  const getMeal = (slot: string) => plan?.meals.find((m: MealItemData) => m.slot === slot);

  // ─── Determine page state ───
  const pageLoading = !profile.loaded || isLoading;
  const profileIncomplete = profile.loaded && criticalMissing.length > 0;
  const generating = isGenerating;
  const hasPlan = !!plan && plan.meals.length > 0;
  const hasNonCriticalGaps = hasPlan && missingSections.length > 0;

  const CRITICAL_FIELD_LABELS: Record<string, string> = {
    age: "年龄", gender: "性别", heightCm: "身高", weightKg: "体重",
  };

  return (
    <>
      <TopBar
        title=""
        rightAction={
          <Link href="/profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
            {session?.user?.name?.charAt(0) ?? "我"}
          </Link>
        }
      />
      <PageContainer>
        {/* Greeting */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-warm-900">
            {getGreeting()}，{session?.user?.name?.split(/\s/)[0] ?? "朋友"}
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            {new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>

        {/* ─── State: Loading ─── */}
        {pageLoading && (
          <div className="space-y-3">
            {SLOTS.map((slot) => (
              <MealSlotCard key={slot} slot={slot} loading />
            ))}
          </div>
        )}

        {/* ─── State: Critical profile fields missing ─── */}
        {!pageLoading && profileIncomplete && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="text-base font-semibold text-warm-900 mb-2">
              还需要一些基础信息
            </h3>
            <p className="text-sm text-warm-600 mb-1">
              缺少：{criticalMissing.map((f) => CRITICAL_FIELD_LABELS[f] ?? f).join("、")}
            </p>
            <p className="text-xs text-warm-400 mb-4">
              AI 需要这些信息来计算您的营养目标和生成个性化推荐
            </p>
            <Link
              href="/health-profile"
              className="inline-block w-full py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 active:scale-[0.98] transition-all"
            >
              去补全档案
            </Link>
            <Link
              href="/ai-survey"
              className="block mt-2 text-sm text-warm-400 hover:text-warm-600 transition-colors"
            >
              或通过 AI 对话快速完善
            </Link>
          </div>
        )}

        {/* ─── State: Generating ─── */}
        {!pageLoading && !profileIncomplete && generating && (
          <div className="space-y-3">
            {SLOTS.map((slot) => (
              <MealSlotCard key={slot} slot={slot} loading />
            ))}
            <p className="text-center text-sm text-primary-600 mt-2">
              AI 正在为您生成今日饮食计划…
            </p>
          </div>
        )}

        {/* ─── State: Generate failed ─── */}
        {!pageLoading && !profileIncomplete && !generating && !hasPlan && generateError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <div className="text-3xl mb-3">😥</div>
            <h3 className="text-base font-semibold text-warm-900 mb-2">
              生成失败
            </h3>
            <p className="text-sm text-warm-600 mb-4">{generateError}</p>
            <button
              onClick={() => generatePlan()}
              className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 active:scale-[0.98] transition-all"
            >
              重试
            </button>
            <Link
              href="/profile"
              className="block mt-2 text-sm text-warm-400 hover:text-warm-600 transition-colors"
            >
              返回个人中心
            </Link>
          </div>
        )}

        {/* ─── State: No plan yet, waiting ─── */}
        {!pageLoading && !profileIncomplete && !generating && !hasPlan && !generateError && (
          <div className="rounded-2xl border border-warm-200 bg-warm-50 p-6 text-center">
            <div className="text-3xl mb-3">🍽️</div>
            <h3 className="text-base font-semibold text-warm-900 mb-2">
              今天还没有饮食计划
            </h3>
            <p className="text-sm text-warm-500 mb-4">
              点击下方按钮，AI 将为您生成个性化推荐
            </p>
            <button
              onClick={() => generatePlan()}
              className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 active:scale-[0.98] transition-all"
            >
              生成今日计划
            </button>
          </div>
        )}

        {/* ─── State: Has plan (not regenerating) ─── */}
        {!pageLoading && hasPlan && !isGenerating && (
          <>
            {/* Non-critical gaps hint */}
            {hasNonCriticalGaps && (
              <Link
                href="/health-profile"
                className="block mb-4 rounded-xl bg-primary-50 border border-primary-100 px-4 py-3 text-center"
              >
                <p className="text-xs text-primary-700">
                  补全档案可提高推荐准确度
                  <span className="ml-1 underline">去补全</span>
                </p>
              </Link>
            )}

            {/* Nutrition summary */}
            {totalCalories > 0 && (
              <div className="mb-5 rounded-2xl bg-white border border-warm-100 p-4">
                <h3 className="text-xs font-medium text-warm-500 mb-3">今日推荐摄入</h3>
                <div className="flex items-center gap-4">
                <NutritionRing recommended={totalCalories} target={profile.targetCalories} />
                <div className="flex-1 space-y-2">
                  {plan!.meals.slice(0, 3).map((m: MealItemData) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className="text-xs text-warm-500 w-8">
                        {m.slot === "breakfast" ? "早餐" : m.slot === "lunch" ? "午餐" : "晚餐"}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-warm-100 overflow-hidden">
                        <div
                          className="h-full bg-primary-400 rounded-full"
                          style={{ width: `${Math.min((m.nutrition?.calories ?? 0) / 800 * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-warm-400 w-14 text-right">
                        {m.nutrition?.calories ?? 0} kcal
                      </span>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            )}

            {/* Meal cards */}
            <div className="mb-5">
              <h2 className="text-base font-semibold text-warm-900 mb-3">今日饮食计划</h2>
              <div className="space-y-3">
                {SLOTS.map((slot) => (
                  <MealSlotCard key={slot} slot={slot} meal={getMeal(slot)} />
                ))}
              </div>

              {/* Regenerate */}
              <button
                onClick={() => generatePlan(true)}
                disabled={isGenerating}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-primary-200 bg-primary-50 text-primary-600 font-semibold text-sm hover:bg-primary-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    AI 正在生成新方案…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    换一批新方案
                  </>
                )}
              </button>
            </div>

            {/* Preference enhancement hint — shown after first plan when prefs are empty */}
            {profile.preferencesEmpty && (
              <Link
                href="/ai-survey"
                className="mt-4 block rounded-2xl bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100 p-4 hover:border-primary-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤖</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-primary-800">让 AI 更懂你的口味</p>
                    <p className="text-xs text-primary-600 mt-0.5">聊几句，推荐更合心意</p>
                  </div>
                  <svg className="h-4 w-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )}
          </>
        )}
      </PageContainer>
    </>
  );
}
