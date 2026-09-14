"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { PageContainer } from "@/components/layout/PageContainer";
import type { ProfileCompleteness } from "@/lib/user-profile";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);

  useEffect(() => {
    fetch("/api/user-profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.completeness) setCompleteness(d.completeness);
      })
      .catch(() => {});
  }, []);

  const CRITICAL_LABELS: Record<string, string> = {
    age: "年龄", gender: "性别", heightCm: "身高", weightKg: "体重",
  };

  return (
    <>
      <TopBar title="我的" />
      <PageContainer>
        {/* Avatar + basic info */}
        <div className="flex flex-col items-center mb-6 mt-2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-3xl font-bold mb-3">
            {session?.user?.name?.charAt(0) ?? "我"}
          </div>
          <h2 className="text-lg font-semibold text-warm-900">{session?.user?.name ?? "用户"}</h2>
          <p className="text-sm text-warm-500">{session?.user?.email ?? ""}</p>
        </div>

        {/* Profile completeness */}
        {completeness && (
          <Link href="/health-profile" className="block mb-5 rounded-2xl border p-4 transition-colors hover:border-primary-200"
            style={{ borderColor: completeness.percentage >= 100 ? "#BBF7D0" : "#FDE68A", backgroundColor: completeness.percentage >= 100 ? "#F0FDF4" : "#FFFBEB" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: completeness.percentage >= 100 ? "#15803D" : "#92400E" }}>
                {completeness.percentage >= 100 ? "档案已完善" : "档案完整度"}
              </span>
              <span className="text-xs font-bold" style={{ color: completeness.percentage >= 100 ? "#15803D" : "#92400E" }}>
                {completeness.percentage}%
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: completeness.percentage >= 100 ? "#DCFCE7" : "#FEF3C7" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${completeness.percentage}%`,
                  backgroundColor: completeness.percentage >= 100 ? "#22C55E" : "#F59E0B",
                }}
              />
            </div>
            {completeness.missingCriticalFields.length > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                缺少：{completeness.missingCriticalFields.map((f) => CRITICAL_LABELS[f] ?? f).join("、")}
                <span className="ml-1">— 补全后推荐更准确</span>
              </p>
            )}
            {completeness.percentage >= 100 && (
              <p className="text-xs text-green-600 mt-2">AI 推荐已基于完整档案生成</p>
            )}
          </Link>
        )}

        {/* Menu */}
        <div className="space-y-2">
          {[
            { href: "/health-profile", icon: "📋", label: "健康档案", desc: "查看和编辑完整个人档案" },
            { href: "/ai-survey", icon: "🤖", label: "补充饮食偏好", desc: "让 AI 更懂你的口味" },
            { href: "/reminders", icon: "⏰", label: "提醒设置", desc: "设置餐前提醒时间" },
            { href: "/records", icon: "📊", label: "健康记录", desc: "记录体重、血糖、血压" },
            { href: "/privacy", icon: "🔒", label: "隐私政策", desc: "" },
          ].map(({ href, icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-2xl bg-white border border-warm-100 px-4 py-3.5 hover:border-primary-200 hover:bg-primary-50 transition-colors"
            >
              <span className="text-xl">{icon}</span>
              <div className="flex-1">
                <span className="text-sm font-medium text-warm-800">{label}</span>
                {desc && <p className="text-xs text-warm-400 mt-0.5">{desc}</p>}
              </div>
              <svg className="h-4 w-4 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-6 w-full py-3.5 rounded-xl border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors"
        >
          退出登录
        </button>
      </PageContainer>
    </>
  );
}
