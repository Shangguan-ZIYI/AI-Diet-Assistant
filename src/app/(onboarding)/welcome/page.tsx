"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    icon: "🥗",
    title: "个性化三餐推荐",
    description: "基于您的身体数据、健康目标和口味偏好，每天生成专属的饮食计划",
  },
  {
    icon: "🤖",
    title: "AI 智能分析",
    description: "智能识别您的饮食需求，确保推荐安全可执行，并随反馈持续优化",
  },
  {
    icon: "📊",
    title: "健康数据追踪",
    description: "记录体重、血糖等关键指标，直观看到饮食调整带来的改变",
  },
];

export default function WelcomePage() {
  const [current, setCurrent] = useState(0);

  return (
    <div className="flex flex-1 flex-col px-6 pt-12 pb-8">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <span className="font-bold text-warm-900">健康饮食助理</span>
      </div>

      {/* Slide */}
      <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
        <div className="text-7xl mb-8">{SLIDES[current].icon}</div>
        <h2 className="text-2xl font-bold text-warm-900 mb-3 text-balance">
          {SLIDES[current].title}
        </h2>
        <p className="text-base text-warm-500 leading-relaxed max-w-xs text-balance">
          {SLIDES[current].description}
        </p>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              "h-2 rounded-full transition-all",
              i === current ? "w-6 bg-primary-500" : "w-2 bg-warm-200"
            )}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {current < SLIDES.length - 1 ? (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 active:scale-[0.98] transition-all shadow-sm shadow-primary-200"
          >
            下一步
          </button>
        ) : (
          <Link
            href="/register"
            className="block w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold text-center hover:bg-primary-600 active:scale-[0.98] transition-all shadow-sm shadow-primary-200"
          >
            开始使用
          </Link>
        )}
        <div className="text-center text-sm text-warm-400">
          已有账号？{" "}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">
            直接登录
          </Link>
        </div>
      </div>
    </div>
  );
}
