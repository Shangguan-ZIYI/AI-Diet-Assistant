"use client";

import { cn } from "@/lib/utils";
import type { UserProfileData, ProfileCompleteness } from "@/lib/user-profile";

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "久坐少动", light: "轻度活动", moderate: "中度活动", active: "积极活动", very_active: "高强度活动",
};
const CHRONIC_LABELS: Record<string, string> = {
  diabetes: "糖尿病", hypertension: "高血压", hyperlipidemia: "高血脂",
  gout: "痛风", obesity: "肥胖", heart_disease: "心脏病", kidney_disease: "肾病",
};
const DIET_STYLE_LABELS: Record<string, string> = {
  balanced: "均衡饮食", low_carb: "低碳减脂", vegetarian: "素食为主",
  vegan: "纯素食", mediterranean: "地中海饮食",
};
const COOKING_LABELS: Record<string, string> = {
  none: "不会做饭", basic: "基础烹饪", intermediate: "比较熟练", advanced: "厨艺不错",
};

interface HealthProfileViewProps {
  profile: UserProfileData;
  completeness?: ProfileCompleteness;
  onEdit: () => void;
}

function InfoItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-warm-400">{label}</span>
      <div className="text-sm font-medium text-warm-800 mt-0.5">{value}</div>
    </div>
  );
}

function TagList({ items, color }: { items: string[]; color: "red" | "amber" | "primary" | "teal" }) {
  if (!items.length) return null;
  const colors = {
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    primary: "bg-primary-50 border-primary-200 text-primary-700",
    teal: "bg-teal-50 border-teal-200 text-teal-700",
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={cn("px-3 py-1.5 rounded-full border text-xs font-medium", colors[color])}>
          {CHRONIC_LABELS[item] ?? item}
        </span>
      ))}
    </div>
  );
}

export function HealthProfileView({ profile: p, completeness, onEdit }: HealthProfileViewProps) {
  const bmi = p.heightCm && p.weightKg
    ? (p.weightKg / (p.heightCm / 100) ** 2).toFixed(1)
    : null;
  const bmiCategory = bmi
    ? Number(bmi) < 18.5 ? "偏瘦" : Number(bmi) < 24 ? "正常" : Number(bmi) < 28 ? "超重" : "肥胖"
    : null;
  const bmiColor = bmi
    ? Number(bmi) < 18.5 ? "text-blue-600" : Number(bmi) < 24 ? "text-green-600" : Number(bmi) < 28 ? "text-amber-600" : "text-red-600"
    : "";

  return (
    <div className="flex flex-1 flex-col px-6 pt-4 pb-8">
      {/* Completeness bar — always visible */}
      {completeness && (
        <div className={cn(
          "rounded-2xl border p-4 mb-4",
          completeness.percentage >= 100 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-xs font-medium", completeness.percentage >= 100 ? "text-green-700" : "text-amber-700")}>
              {completeness.percentage >= 100 ? "档案已完善" : "档案完整度"}
            </span>
            <span className={cn("text-xs font-bold", completeness.percentage >= 100 ? "text-green-700" : "text-amber-700")}>
              {completeness.percentage}%
            </span>
          </div>
          <div className={cn("h-2 rounded-full", completeness.percentage >= 100 ? "bg-green-100" : "bg-amber-100")}>
            <div
              className={cn("h-2 rounded-full transition-all", completeness.percentage >= 100 ? "bg-green-400" : "bg-amber-400")}
              style={{ width: `${completeness.percentage}%` }}
            />
          </div>
          {completeness.missingCriticalFields.length > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              还差 {completeness.missingCriticalFields.length} 项关键信息：{completeness.missingCriticalFields.map(f => {
                const labels: Record<string, string> = { age: "年龄", gender: "性别", heightCm: "身高", weightKg: "体重" };
                return labels[f] ?? f;
              }).join("、")}
              <span className="block mt-1 text-amber-500">补全后 AI 推荐会更准确</span>
            </p>
          )}
          {completeness.percentage >= 100 && (
            <p className="text-xs text-green-600 mt-2">AI 已根据您的完整档案生成个性化推荐</p>
          )}
        </div>
      )}

      {/* BMI Hero */}
      {bmi && (
        <div className="rounded-2xl bg-gradient-to-br from-primary-50 to-teal-50 border border-primary-100 p-5 mb-4 text-center">
          <div className="text-xs text-warm-500 mb-1">BMI 指数</div>
          <div className={cn("text-3xl font-bold", bmiColor)}>{bmi}</div>
          <div className={cn("text-sm font-medium mt-1", bmiColor)}>{bmiCategory}</div>
          {p.targetWeightKg && p.weightKg && p.targetWeightKg !== p.weightKg && (
            <div className="text-xs text-warm-400 mt-2">
              目标体重 {p.targetWeightKg} kg（距目标 {Math.abs(p.weightKg - p.targetWeightKg).toFixed(1)} kg）
            </div>
          )}
        </div>
      )}

      {/* Basic Info */}
      <div className="rounded-2xl bg-white border border-warm-100 p-4 mb-3">
        <h3 className="text-sm font-semibold text-warm-800 mb-3">基本信息</h3>
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          <InfoItem label="年龄" value={p.age ? `${p.age} 岁` : null} />
          <InfoItem label="性别" value={p.gender === "male" ? "男" : p.gender === "female" ? "女" : null} />
          <InfoItem label="活动水平" value={ACTIVITY_LABELS[p.activityLevel ?? ""] ?? null} />
          <InfoItem label="身高" value={p.heightCm ? `${p.heightCm} cm` : null} />
          <InfoItem label="体重" value={p.weightKg ? `${p.weightKg} kg` : null} />
          <InfoItem label="目标体重" value={p.targetWeightKg ? `${p.targetWeightKg} kg` : null} />
        </div>
      </div>

      {/* Health Metrics */}
      {(p.bloodSugarMmol || p.bloodPressureSys) && (
        <div className="rounded-2xl bg-white border border-warm-100 p-4 mb-3">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">健康指标</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoItem label="空腹血糖" value={p.bloodSugarMmol ? `${p.bloodSugarMmol} mmol/L` : null} />
            {p.bloodPressureSys && p.bloodPressureDia && (
              <InfoItem label="血压" value={`${p.bloodPressureSys}/${p.bloodPressureDia} mmHg`} />
            )}
          </div>
        </div>
      )}

      {/* Health Goals */}
      {p.healthGoals.length > 0 && (
        <div className="rounded-2xl bg-white border border-warm-100 p-4 mb-3">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">健康目标</h3>
          <TagList items={p.healthGoals} color="primary" />
        </div>
      )}

      {/* Chronic Diseases */}
      {p.chronicDiseases.length > 0 && (
        <div className="rounded-2xl bg-white border border-warm-100 p-4 mb-3">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">慢性病史</h3>
          <TagList items={p.chronicDiseases} color="amber" />
        </div>
      )}

      {/* Allergies */}
      {p.allergies.length > 0 && (
        <div className="rounded-2xl bg-white border border-warm-100 p-4 mb-3">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">过敏食物</h3>
          <TagList items={p.allergies} color="red" />
        </div>
      )}

      {/* Medical Restrictions */}
      {p.medicalRestrictions.length > 0 && (
        <div className="rounded-2xl bg-white border border-warm-100 p-4 mb-3">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">医嘱限制</h3>
          <TagList items={p.medicalRestrictions} color="amber" />
        </div>
      )}

      {/* Forbidden Ingredients */}
      {p.forbiddenIngredients.length > 0 && (
        <div className="rounded-2xl bg-white border border-warm-100 p-4 mb-3">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">绝对不吃</h3>
          <TagList items={p.forbiddenIngredients} color="red" />
        </div>
      )}

      {/* Diet Preferences */}
      {(p.tastePref.length > 0 || p.cuisinePref.length > 0 || p.dietStyle) && (
        <div className="rounded-2xl bg-white border border-warm-100 p-4 mb-3">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">饮食偏好</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {p.tastePref.length > 0 && <InfoItem label="口味" value={p.tastePref.join("、")} />}
            {p.cuisinePref.length > 0 && <InfoItem label="菜系" value={p.cuisinePref.join("、")} />}
            {p.dietStyle && <InfoItem label="饮食风格" value={DIET_STYLE_LABELS[p.dietStyle] ?? p.dietStyle} />}
            {p.proteinPreference.length > 0 && <InfoItem label="蛋白偏好" value={p.proteinPreference.join("、")} />}
            {p.cookingMethodPref.length > 0 && <InfoItem label="烹饪方式" value={p.cookingMethodPref.join("、")} />}
            {p.budgetPerMeal && <InfoItem label="每餐预算" value={`${p.budgetPerMeal} 元`} />}
            {p.cookingAbility && <InfoItem label="烹饪能力" value={COOKING_LABELS[p.cookingAbility] ?? p.cookingAbility} />}
            {p.usualDiningPeople > 1 && <InfoItem label="用餐人数" value={`${p.usualDiningPeople} 人`} />}
          </div>
        </div>
      )}

      {/* Doctor Notes */}
      {p.doctorNotes && (
        <div className="rounded-2xl bg-white border border-warm-100 p-4 mb-3">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">医嘱备注</h3>
          <p className="text-sm text-warm-700">{p.doctorNotes}</p>
        </div>
      )}

      <button
        onClick={onEdit}
        className="mt-4 w-full py-3.5 rounded-xl border border-primary-200 text-primary-600 font-semibold hover:bg-primary-50 transition-colors"
      >
        编辑档案
      </button>
    </div>
  );
}
