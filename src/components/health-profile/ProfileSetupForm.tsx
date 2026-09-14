"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const CHRONIC_DISEASES = [
  { value: "diabetes", label: "糖尿病" },
  { value: "hypertension", label: "高血压" },
  { value: "hyperlipidemia", label: "高血脂" },
  { value: "gout", label: "痛风" },
  { value: "obesity", label: "肥胖" },
  { value: "heart_disease", label: "心脏病" },
  { value: "kidney_disease", label: "肾病" },
];

const COMMON_ALLERGIES = [
  "花生", "坚果", "海鲜", "鱼", "鸡蛋", "牛奶", "小麦", "大豆", "芒果", "桃子",
];

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "久坐少动", desc: "几乎不运动" },
  { value: "light", label: "轻度活动", desc: "每周1-2次" },
  { value: "moderate", label: "中度活动", desc: "每周3-4次" },
  { value: "active", label: "积极活动", desc: "每周5次以上" },
];

const MEDICAL_RESTRICTIONS = [
  { value: "控糖", label: "控糖" },
  { value: "低盐", label: "低盐" },
  { value: "低嘌呤", label: "低嘌呤" },
  { value: "少辛辣", label: "少辛辣" },
  { value: "低脂", label: "低脂" },
  { value: "高纤维", label: "高纤维" },
];

const HEALTH_GOALS = [
  { value: "减脂", label: "减脂控重" },
  { value: "控糖", label: "控制血糖" },
  { value: "控血压", label: "控制血压" },
  { value: "增肌", label: "增肌塑形" },
  { value: "规律饮食", label: "规律饮食" },
  { value: "维持健康", label: "维持健康" },
];

interface ProfileSetupFormProps {
  returnPath?: string;
  onSaved?: () => void;
}

export function ProfileSetupForm({ returnPath = "/home", onSaved }: ProfileSetupFormProps) {
  const [step, setStep] = useState<"basic" | "health" | "goals">("basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Basic info
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState<string>("");

  // Health info
  const [bloodSugar, setBloodSugar] = useState("");
  const [bloodPressureSys, setBloodPressureSys] = useState("");
  const [bloodPressureDia, setBloodPressureDia] = useState("");
  const [chronicDiseases, setChronicDiseases] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [medicalRestrictions, setMedicalRestrictions] = useState<string[]>([]);
  const [doctorNotes, setDoctorNotes] = useState("");

  // Goals & restrictions
  const [forbiddenIngredients, setForbiddenIngredients] = useState("");
  const [healthGoals, setHealthGoals] = useState<string[]>([]);

  // Pre-fill from existing unified profile
  useEffect(() => {
    fetch("/api/user-profile")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success || !data.data) return;
        const p = data.data;
        if (p.age) setAge(String(p.age));
        if (p.gender) setGender(p.gender);
        if (p.heightCm) setHeight(String(p.heightCm));
        if (p.weightKg) setWeight(String(p.weightKg));
        if (p.targetWeightKg) setTargetWeight(String(p.targetWeightKg));
        if (p.activityLevel) setActivityLevel(p.activityLevel);
        if (p.bloodSugarMmol) setBloodSugar(String(p.bloodSugarMmol));
        if (p.bloodPressureSys) setBloodPressureSys(String(p.bloodPressureSys));
        if (p.bloodPressureDia) setBloodPressureDia(String(p.bloodPressureDia));
        if (p.chronicDiseases?.length) setChronicDiseases(p.chronicDiseases);
        if (p.allergies?.length) setAllergies(p.allergies);
        if (p.medicalRestrictions?.length) setMedicalRestrictions(p.medicalRestrictions);
        if (p.doctorNotes) setDoctorNotes(p.doctorNotes);
        if (p.forbiddenIngredients?.length) setForbiddenIngredients(p.forbiddenIngredients.join("、"));
        if (p.healthGoals?.length) setHealthGoals(p.healthGoals);
      })
      .catch(() => {});
  }, []);

  function toggleItem(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function addCustomAllergy() {
    if (customAllergy.trim() && !allergies.includes(customAllergy.trim())) {
      setAllergies([...allergies, customAllergy.trim()]);
      setCustomAllergy("");
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: age ? parseInt(age) : null,
          gender: gender || null,
          heightCm: height ? parseFloat(height) : null,
          weightKg: weight ? parseFloat(weight) : null,
          targetWeightKg: targetWeight ? parseFloat(targetWeight) : null,
          activityLevel: activityLevel || null,
          bloodSugarMmol: bloodSugar ? parseFloat(bloodSugar) : null,
          bloodPressureSys: bloodPressureSys ? parseInt(bloodPressureSys) : null,
          bloodPressureDia: bloodPressureDia ? parseInt(bloodPressureDia) : null,
          chronicDiseases,
          allergies,
          medicalRestrictions,
          doctorNotes: doctorNotes || null,
          forbiddenIngredients: forbiddenIngredients
            ? forbiddenIngredients.split(/[、,，\s]+/).filter(Boolean)
            : [],
          healthGoals,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message ?? "保存失败");
        return;
      }

      // Mark onboarding as complete (skip AI survey)
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: ["welcome", "privacy", "profile-setup"] }),
      });

      if (onSaved) {
        onSaved();
      } else {
        // Hard navigation to bypass Next.js cache
        window.location.href = returnPath;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Progress */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center gap-2 mb-4">
          {["basic", "health", "goals"].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "h-2 flex-1 rounded-full transition-all",
                step === s || (s === "basic" && ["health", "goals"].includes(step)) || (s === "health" && step === "goals")
                  ? "bg-primary-500"
                  : "bg-warm-200"
              )} style={{ width: "64px" }} />
            </div>
          ))}
        </div>
        <h1 className="text-xl font-bold text-warm-900">
          {step === "basic" && "基本信息"}
          {step === "health" && "健康指标"}
          {step === "goals" && "安全与目标"}
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          {step === "basic" && "必填项 — AI 需要这些数据计算您的营养目标"}
          {step === "health" && "选填 — 帮助规避饮食风险，推荐填写"}
          {step === "goals" && "重要 — 请仔细填写以保障饮食安全"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {step === "basic" && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>年龄</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="岁" className={inputClass} min="1" max="120" />
              </div>
              <div>
                <label className={labelClass}>性别</label>
                <div className="flex gap-2">
                  {[{ v: "male", l: "男" }, { v: "female", l: "女" }].map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => setGender(v as "male" | "female")}
                      className={cn("flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border",
                        gender === v ? "bg-primary-50 border-primary-400 text-primary-700" : "bg-white border-warm-200 text-warm-600"
                      )}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>身高</label>
                <div className="relative">
                  <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" className={cn(inputClass, "pr-10")} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-warm-400">cm</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>体重</label>
                <div className="relative">
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="65" className={cn(inputClass, "pr-8")} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-warm-400">kg</span>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>目标体重（可选）</label>
              <div className="relative">
                <input type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="理想体重" className={cn(inputClass, "pr-8")} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-warm-400">kg</span>
              </div>
            </div>

            <div>
              <label className={labelClass}>活动水平</label>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITY_LEVELS.map(({ value, label, desc }) => (
                  <button key={value} type="button" onClick={() => setActivityLevel(value)}
                    className={cn("p-3 rounded-xl text-left transition-all border",
                      activityLevel === value ? "bg-primary-50 border-primary-400" : "bg-white border-warm-200"
                    )}>
                    <div className={cn("text-sm font-medium", activityLevel === value ? "text-primary-700" : "text-warm-800")}>{label}</div>
                    <div className="text-xs text-warm-400 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "health" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className={labelClass}>空腹血糖（可选）</label>
              <div className="relative">
                <input type="number" step="0.1" value={bloodSugar} onChange={(e) => setBloodSugar(e.target.value)} placeholder="5.6" className={cn(inputClass, "pr-20")} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-warm-400">mmol/L</span>
              </div>
              <p className="text-xs text-warm-400 mt-1">正常值：3.9-6.1 mmol/L</p>
            </div>

            <div>
              <label className={labelClass}>血压（可选）</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input type="number" value={bloodPressureSys} onChange={(e) => setBloodPressureSys(e.target.value)} placeholder="120" className={cn(inputClass, "pr-12")} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-warm-400">收缩</span>
                </div>
                <span className="text-warm-400 font-medium">/</span>
                <div className="relative flex-1">
                  <input type="number" value={bloodPressureDia} onChange={(e) => setBloodPressureDia(e.target.value)} placeholder="80" className={cn(inputClass, "pr-12")} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-warm-400">舒张</span>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>慢性病史（可多选）</label>
              <div className="flex flex-wrap gap-2">
                {CHRONIC_DISEASES.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => toggleItem(chronicDiseases, setChronicDiseases, value)}
                    className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                      chronicDiseases.includes(value) ? "bg-primary-100 border-primary-400 text-primary-700" : "bg-white border-warm-200 text-warm-600"
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "goals" && (
          <div className="space-y-5 animate-fade-in">
            {/* Allergies */}
            <div>
              <label className={labelClass}>过敏食物（重要）</label>
              <p className="text-xs text-warm-400 mb-2">AI 推荐将严格排除这些食材</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_ALLERGIES.map((item) => (
                  <button key={item} type="button" onClick={() => toggleItem(allergies, setAllergies, item)}
                    className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                      allergies.includes(item) ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-warm-200 text-warm-600"
                    )}>
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={customAllergy} onChange={(e) => setCustomAllergy(e.target.value)} placeholder="其他过敏食物" className={cn(inputClass, "flex-1")}
                  onKeyDown={(e) => e.key === "Enter" && addCustomAllergy()} />
                <button type="button" onClick={addCustomAllergy} className="px-4 py-2.5 rounded-xl bg-warm-100 text-warm-700 text-sm font-medium hover:bg-warm-200 transition-colors">
                  添加
                </button>
              </div>
              {allergies.filter((a) => !COMMON_ALLERGIES.includes(a)).map((a) => (
                <span key={a} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-50 border border-red-300 text-red-700 text-sm mr-2 mt-2">
                  {a}
                  <button onClick={() => setAllergies(allergies.filter((x) => x !== a))} className="ml-0.5 hover:text-red-900">×</button>
                </span>
              ))}
            </div>

            {/* Medical restrictions */}
            <div>
              <label className={labelClass}>医嘱限制</label>
              <p className="text-xs text-warm-400 mb-2">医生要求的饮食限制（可多选）</p>
              <div className="flex flex-wrap gap-2">
                {MEDICAL_RESTRICTIONS.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => toggleItem(medicalRestrictions, setMedicalRestrictions, value)}
                    className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                      medicalRestrictions.includes(value) ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-warm-200 text-warm-600"
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Forbidden ingredients */}
            <div>
              <label className={labelClass}>绝对不吃的食材</label>
              <p className="text-xs text-warm-400 mb-2">非过敏但坚决不接受的食材，用顿号分隔</p>
              <input value={forbiddenIngredients} onChange={(e) => setForbiddenIngredients(e.target.value)}
                placeholder="例如：猪肉、动物血" className={inputClass} />
            </div>

            {/* Doctor notes */}
            <div>
              <label className={labelClass}>医嘱备注（可选）</label>
              <textarea value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="例如：医生建议禁食生冷、每日食盐不超过3克"
                className={cn(inputClass, "h-20 resize-none")} />
            </div>

            {/* Health goals */}
            <div>
              <label className={labelClass}>健康目标</label>
              <p className="text-xs text-warm-400 mb-2">希望通过饮食达成的目标（可多选）</p>
              <div className="flex flex-wrap gap-2">
                {HEALTH_GOALS.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => toggleItem(healthGoals, setHealthGoals, value)}
                    className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                      healthGoals.includes(value) ? "bg-primary-100 border-primary-400 text-primary-700" : "bg-white border-warm-200 text-warm-600"
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mb-2">
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        </div>
      )}

      {/* Footer buttons */}
      <div className="px-6 pb-8 pt-2 space-y-2">
        {step === "basic" && (
          <>
            <button onClick={() => setStep("health")} className={primaryBtn}>下一步</button>
            <button onClick={() => setStep("health")} className={skipBtn}>跳过（可稍后填写）</button>
          </>
        )}
        {step === "health" && (
          <>
            <button onClick={() => setStep("goals")} className={primaryBtn}>下一步</button>
            <button onClick={() => setStep("basic")} className={skipBtn}>上一步</button>
          </>
        )}
        {step === "goals" && (
          <>
            <button onClick={handleSubmit} disabled={loading} className={cn(primaryBtn, "disabled:opacity-60")}>
              {loading ? "保存中…" : "保存并继续"}
            </button>
            <button onClick={() => setStep("health")} className={skipBtn}>上一步</button>
          </>
        )}
      </div>
    </div>
  );
}

const labelClass = "block text-sm font-medium text-warm-700 mb-1.5";
const inputClass = "w-full rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-warm-900 placeholder-warm-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all";
const primaryBtn = "w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 active:scale-[0.98] transition-all shadow-sm shadow-primary-200";
const skipBtn = "w-full py-2.5 rounded-xl text-warm-500 text-sm font-medium text-center hover:text-warm-700 transition-colors";
