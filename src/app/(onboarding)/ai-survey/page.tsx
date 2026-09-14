"use client";

import { useEffect, useRef, useState } from "react";
import { useAiChat } from "@/hooks/useAiChat";
import { cn } from "@/lib/utils";
import type { SurveyResult } from "@/lib/survey-prompts";
import type { UserProfileData } from "@/lib/user-profile";

export default function AiSurveyPage() {
  const [isUpdate, setIsUpdate] = useState(false);
  const [existingProfile, setExistingProfile] = useState<UserProfileData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const { messages, isStreaming, quickReplies, extractedResult, sendMessage, startSurvey } = useAiChat(
    isUpdate ? "update" : "initial",
    existingProfile
  );
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [diffFields, setDiffFields] = useState<Record<string, { old: unknown; new: unknown; accepted: boolean }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // Check if user already has profile (update mode)
  useEffect(() => {
    fetch("/api/user-profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setExistingProfile(data.data);
          if (data.data.tastePref?.length > 0) {
            setIsUpdate(true);
          }
        }
        setProfileLoaded(true);
      })
      .catch(() => { setProfileLoaded(true); });
  }, []);

  // Start survey after profile is loaded (so context-aware prompt is used)
  useEffect(() => {
    if (profileLoaded && !started.current) {
      started.current = true;
      startSurvey();
    }
  }, [profileLoaded, startSurvey]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle survey completion
  useEffect(() => {
    if (!extractedResult || saving) return;

    if (isUpdate && existingProfile) {
      // Update mode: compute diff and show confirmation
      const diff = computeDiff(existingProfile, extractedResult);
      if (Object.keys(diff).length === 0) {
        // No changes
        saveAndRedirect(extractedResult, {});
      } else {
        setDiffFields(diff);
        setShowConfirm(true);
      }
    } else {
      // Initial mode: save directly
      saveAndRedirect(extractedResult, null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractedResult]);

  async function saveAndRedirect(result: SurveyResult, acceptedChanges: Record<string, { old: unknown; new: unknown; accepted: boolean }> | null) {
    setSaving(true);
    try {
      // Build the data to save
      let profileData: Record<string, unknown>;
      if (acceptedChanges === null) {
        // Initial: save everything from result
        profileData = { ...result };
        delete (profileData as Record<string, unknown>).notes;
      } else {
        // Update: only save accepted fields
        profileData = {};
        for (const [field, { new: newVal, accepted }] of Object.entries(acceptedChanges)) {
          if (accepted) {
            profileData[field] = newVal;
          }
        }
      }

      // Save to unified profile
      if (Object.keys(profileData).length > 0) {
        const profileRes = await fetch("/api/user-profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileData),
        });
        console.log("[survey] profile save:", profileRes.status, await profileRes.json().catch(() => null));
      }

      // Mark onboarding as complete — MUST succeed before redirect
      const completeRes = await fetch("/api/onboarding/complete", { method: "POST" });
      const completeData = await completeRes.json().catch(() => null);
      console.log("[survey] onboarding complete:", completeRes.status, completeData);

      if (!completeRes.ok) {
        console.error("[survey] Failed to mark onboarding complete!", completeData);
      }

      // Save survey session (non-blocking for redirect)
      fetch("/api/survey-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          extractedResult: result,
          suggestedUpdates: acceptedChanges ? Object.fromEntries(
            Object.entries(acceptedChanges).map(([k, v]) => [k, v.new])
          ) : null,
          appliedFields: acceptedChanges
            ? Object.entries(acceptedChanges).filter(([, v]) => v.accepted).map(([k]) => k)
            : Object.keys(profileData),
          status: "applied",
        }),
      }).catch((e) => console.error("[survey] session save error:", e));

      // Hard navigation — wait a bit for user to see success message
      setTimeout(() => { window.location.href = "/home"; }, 1500);
    } catch (err) {
      console.error("[survey] Save error:", err);
      // Still try to mark complete even on error
      await fetch("/api/onboarding/complete", { method: "POST" }).catch(() => {});
      setTimeout(() => { window.location.href = "/home"; }, 1500);
    }
  }

  function handleConfirmDiff() {
    if (!extractedResult) return;
    saveAndRedirect(extractedResult, diffFields);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Diff confirmation UI
  if (showConfirm) {
    return (
      <div className="flex flex-1 flex-col h-dvh">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-warm-100 bg-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500">
            <span className="text-white text-sm font-bold">健</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-warm-900">确认更新</div>
            <div className="text-xs text-warm-400">以下信息有变化，请确认是否更新</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {Object.entries(diffFields).map(([field, { old: oldVal, new: newVal, accepted }]) => (
            <div key={field} className={cn("rounded-2xl border p-4 transition-colors",
              accepted ? "bg-primary-50 border-primary-200" : "bg-warm-50 border-warm-200"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-warm-800">{FIELD_LABELS[field] ?? field}</span>
                <button
                  onClick={() => setDiffFields((prev) => ({
                    ...prev,
                    [field]: { ...prev[field], accepted: !prev[field].accepted },
                  }))}
                  className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all",
                    accepted ? "bg-primary-500 text-white border-primary-500" : "bg-white text-warm-500 border-warm-300"
                  )}
                >
                  {accepted ? "已接受" : "跳过"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-warm-400">当前值</span>
                  <div className="text-warm-600 mt-1">{formatValue(oldVal)}</div>
                </div>
                <div>
                  <span className="text-primary-500">建议更新为</span>
                  <div className="text-primary-700 font-medium mt-1">{formatValue(newVal)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 pb-6 pt-2 space-y-2">
          <button
            onClick={handleConfirmDiff}
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? "保存中…" : `确认更新（${Object.values(diffFields).filter((v) => v.accepted).length} 项）`}
          </button>
          <button
            onClick={() => { window.location.href = "/home"; }}
            className="w-full py-2.5 rounded-xl text-warm-500 text-sm font-medium text-center hover:text-warm-700 transition-colors"
          >
            放弃更新
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-warm-100 bg-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500">
          <span className="text-white text-sm font-bold">健</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-warm-900">小健</div>
          <div className="text-xs text-warm-400">饮食偏好助手</div>
        </div>
        {messages.length > 0 && !extractedResult && (
          <button
            onClick={async () => {
              await fetch("/api/onboarding/complete", { method: "POST" });
              window.location.href = "/home";
            }}
            className="ml-auto text-xs text-warm-400 hover:text-warm-600"
          >
            跳过
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 mr-2 mt-0.5 flex-shrink-0">
                <span className="text-white text-xs font-bold">健</span>
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-primary-500 text-white rounded-tr-sm"
                : "bg-warm-100 text-warm-900 rounded-tl-sm"
            )}>
              {msg.content.replace(/\[SURVEY_COMPLETE\][\s\S]*/g, "").replace(/\[HARD_CONSTRAINT:[^\]]+\]/g, "").trim() || (msg.isStreaming ? "" : msg.content)}
              {msg.isStreaming && (
                <span className="inline-flex gap-1 ml-1">
                  {[0, 1, 2].map((j) => (
                    <span key={j} className="inline-block h-1.5 w-1.5 rounded-full bg-warm-400 animate-pulse-dot"
                      style={{ animationDelay: `${j * 0.2}s` }} />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}

        {extractedResult && !showConfirm && (
          <div className="flex justify-center">
            <div className="bg-primary-50 border border-primary-200 rounded-2xl px-5 py-4 text-center max-w-xs">
              <div className="text-2xl mb-2">🎉</div>
              <div className="text-sm font-semibold text-primary-800">
                {isUpdate ? "信息采集完成，正在对比变更…" : "信息采集完成！"}
              </div>
              <div className="text-xs text-primary-600 mt-1">
                {saving ? "正在保存…" : "正在跳转到首页…"}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      {quickReplies.length > 0 && !isStreaming && !extractedResult && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => sendMessage(reply)}
              className="px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-sm hover:bg-primary-100 transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      {!extractedResult && (
        <div className="px-4 pb-6 pt-2 border-t border-warm-100 bg-white">
          <div className="flex gap-2 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的回答…"
              disabled={isStreaming}
              className="flex-1 rounded-xl border border-warm-200 bg-warm-50 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:bg-white transition-all disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                input.trim() && !isStreaming
                  ? "bg-primary-500 text-white hover:bg-primary-600"
                  : "bg-warm-200 text-warm-400"
              )}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  age: "年龄", gender: "性别", heightCm: "身高", weightKg: "体重",
  targetWeightKg: "目标体重", activityLevel: "活动水平",
  chronicDiseases: "慢性病史", bloodSugarMmol: "空腹血糖",
  bloodPressureSys: "收缩压", bloodPressureDia: "舒张压",
  allergies: "过敏食物", medicalRestrictions: "医嘱限制",
  forbiddenIngredients: "绝对不吃", avoidIngredients: "不喜欢的食材",
  tastePref: "口味偏好", cuisinePref: "菜系偏好",
  dietStyle: "饮食风格", staplePreference: "主食偏好",
  proteinPreference: "蛋白质偏好", budgetPerMeal: "每餐预算",
  cookingAbility: "烹饪能力", cookingMethodPref: "烹饪方式偏好",
  maxCookTimeMinutes: "做饭时间", healthGoals: "健康目标",
  doctorNotes: "医嘱备注",
};

function formatValue(val: unknown): string {
  if (val == null) return "未填写";
  if (Array.isArray(val)) return val.length > 0 ? val.join("、") : "无";
  return String(val);
}

function computeDiff(
  existing: UserProfileData,
  survey: SurveyResult
): Record<string, { old: unknown; new: unknown; accepted: boolean }> {
  const diff: Record<string, { old: unknown; new: unknown; accepted: boolean }> = {};

  const fields = [
    "age", "gender", "heightCm", "weightKg", "targetWeightKg", "activityLevel",
    "chronicDiseases", "bloodSugarMmol", "bloodPressureSys", "bloodPressureDia",
    "allergies", "medicalRestrictions", "forbiddenIngredients", "avoidIngredients",
    "tastePref", "cuisinePref", "dietStyle", "staplePreference", "proteinPreference",
    "budgetPerMeal", "cookingAbility", "maxCookTimeMinutes", "cookingMethodPref", "usualDiningPeople",
    "healthGoals", "doctorNotes",
  ];

  for (const field of fields) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldVal = (existing as any)[field];
    const newVal = (survey as Record<string, unknown>)[field];

    if (newVal === undefined || newVal === null) continue;

    const oldStr = JSON.stringify(oldVal ?? null);
    const newStr = JSON.stringify(newVal);

    if (oldStr !== newStr) {
      diff[field] = { old: oldVal, new: newVal, accepted: true };
    }
  }

  return diff;
}
