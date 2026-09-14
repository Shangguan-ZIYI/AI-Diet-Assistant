"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";

const MEAL_SLOTS = [
  { slot: "breakfast", label: "早餐提醒", icon: "🌅", defaultTime: "07:30" },
  { slot: "lunch", label: "午餐提醒", icon: "☀️", defaultTime: "12:00" },
  { slot: "dinner", label: "晚餐提醒", icon: "🌙", defaultTime: "18:30" },
  { slot: "snack", label: "加餐提醒", icon: "🍎", defaultTime: "15:00" },
];

export default function RemindersPage() {
  const [reminders, setReminders] = useState(
    MEAL_SLOTS.map((s) => ({ ...s, enabled: s.slot !== "snack", time: s.defaultTime }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Load saved reminders
  useEffect(() => {
    fetch("/api/reminders")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          setReminders((prev) =>
            prev.map((r) => {
              const saved = data.data.find((s: { slot: string }) => s.slot === r.slot);
              if (saved) {
                return { ...r, enabled: saved.enabled, time: saved.timeHHMM };
              }
              return r;
            })
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleReminder(slot: string) {
    setReminders((prev) =>
      prev.map((r) => (r.slot === slot ? { ...r, enabled: !r.enabled } : r))
    );
    setSaveStatus("idle");
  }

  function updateTime(slot: string, time: string) {
    setReminders((prev) =>
      prev.map((r) => (r.slot === slot ? { ...r, time } : r))
    );
    setSaveStatus("idle");
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminders: reminders.map((r) => ({
            slot: r.slot,
            timeHHMM: r.time,
            enabled: r.enabled,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TopBar title="提醒设置" showBack />
      <PageContainer>
        <p className="text-sm text-warm-500 mb-5">设置餐前提醒时间，帮助您养成规律饮食习惯</p>

        <div className="space-y-3">
          {reminders.map(({ slot, label, icon, enabled, time }) => (
            <div key={slot} className={cn("rounded-2xl bg-white border border-warm-100 p-4", loading && "animate-pulse")}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-semibold text-warm-900">{label}</span>
                </div>
                <button
                  onClick={() => toggleReminder(slot)}
                  disabled={loading}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    enabled ? "bg-primary-500" : "bg-warm-200"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    enabled ? "left-[22px]" : "left-0.5"
                  )} />
                </button>
              </div>
              {enabled && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-warm-500">提醒时间</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateTime(slot, e.target.value)}
                    className="rounded-lg border border-warm-200 px-2 py-1 text-sm text-warm-800 outline-none focus:border-primary-400"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="mt-6 w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 active:scale-[0.98] transition-all shadow-sm shadow-primary-200 disabled:opacity-60"
        >
          {saving ? "保存中…" : "保存设置"}
        </button>

        {/* Save feedback */}
        {saveStatus === "success" && (
          <div className="mt-3 rounded-xl bg-primary-50 border border-primary-200 p-3 text-center">
            <p className="text-sm text-primary-700 font-medium">设置已保存</p>
            <p className="text-xs text-primary-500 mt-1">系统通知推送功能即将上线，届时将按您设置的时间发送提醒</p>
          </div>
        )}
        {saveStatus === "error" && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-center">
            <p className="text-sm text-red-700">保存失败，请重试</p>
          </div>
        )}
      </PageContainer>
    </>
  );
}
