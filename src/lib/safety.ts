// Rule-based safety layer that runs BEFORE any AI API call

export interface UserHealthContext {
  age?: number | null;
  gender?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  targetWeightKg?: number | null;
  activityLevel?: string | null;
  // 4-level dietary restriction model
  allergies: string[];              // L1: 医学过敏 → 绝对排除
  chronicDiseases: string[];        // 慢病诊断 → 触发疾病规则
  medicalRestrictions: string[];    // L2: 医嘱/健康限制（控糖、低盐等）→ 结构化约束
  forbiddenIngredients: string[];   // L3: 用户明确绝对不吃 → 绝对排除
  healthGoals: string[];            // 目标驱动约束（即使无诊断也生效）
}

export interface NutritionTargets {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

// ─── TDEE Calculation (Mifflin-St Jeor) ──────────────────────────────────────

export function calculateTDEE(ctx: UserHealthContext): NutritionTargets {
  const age = ctx.age ?? 30;
  const heightCm = ctx.heightCm ?? 170;
  const weightKg = ctx.weightKg ?? 65;
  const gender = ctx.gender ?? "male";

  // BMR
  let bmr: number;
  if (gender === "female") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }

  // Activity multiplier
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const multiplier = multipliers[ctx.activityLevel ?? "sedentary"] ?? 1.2;
  let tdee = Math.round(bmr * multiplier);

  // Adjust for goal
  if (ctx.targetWeightKg && ctx.weightKg) {
    if (ctx.targetWeightKg < ctx.weightKg) {
      tdee = Math.max(tdee - 400, gender === "female" ? 1200 : 1500);
    } else if (ctx.targetWeightKg > ctx.weightKg) {
      tdee = tdee + 300;
    }
  }

  // Macro split (balanced: 30P/40C/30F)
  const proteinG = Math.round((tdee * 0.3) / 4);
  const carbsG = Math.round((tdee * 0.4) / 4);
  const fatG = Math.round((tdee * 0.3) / 9);

  return { dailyCalories: tdee, proteinG, carbsG, fatG };
}

// ─── Chronic Disease Rules ────────────────────────────────────────────────────

interface DiseaseRule {
  avoid: string[];
  limit: string[];
  notes: string;
}

const DISEASE_RULES: Record<string, DiseaseRule> = {
  diabetes: {
    avoid: ["白糖", "蜂蜜", "含糖饮料", "甜点", "白米饭", "白面包", "精制糖"],
    limit: ["白米", "面条", "土豆", "玉米"],
    notes: "低GI饮食，控制精制碳水化合物摄入，餐后血糖管理",
  },
  hypertension: {
    avoid: ["腌制食品", "咸菜", "酱菜", "高钠食品"],
    limit: ["食盐", "酱油", "味精", "加工食品"],
    notes: "低钠饮食，每日食盐不超过5克，多吃富含钾的食物",
  },
  hyperlipidemia: {
    avoid: ["动物内脏", "肥肉", "奶油", "猪油", "椰子油"],
    limit: ["蛋黄", "全脂奶制品", "红肉"],
    notes: "低饱和脂肪饮食，增加不饱和脂肪酸摄入",
  },
  gout: {
    avoid: ["动物内脏", "沙丁鱼", "凤尾鱼", "浓肉汤", "啤酒"],
    limit: ["红肉", "海鲜", "菠菜", "豆腐"],
    notes: "低嘌呤饮食，多饮水，避免酒精",
  },
  obesity: {
    avoid: ["油炸食品", "高热量零食", "含糖饮料"],
    limit: ["精制碳水", "高脂肪食品"],
    notes: "控制总热量摄入，增加膳食纤维，控制饮食频率",
  },
};

export function getDiseaseConstraints(diseases: string[]): string {
  const constraints: string[] = [];

  for (const disease of diseases) {
    const rule = DISEASE_RULES[disease];
    if (rule) {
      if (rule.avoid.length > 0) {
        constraints.push(
          `【${disease}禁忌】绝对禁止：${rule.avoid.join("、")}`
        );
      }
      if (rule.limit.length > 0) {
        constraints.push(
          `【${disease}限制】严格限量：${rule.limit.join("、")}`
        );
      }
      constraints.push(`【${disease}原则】${rule.notes}`);
    }
  }

  return constraints.join("\n");
}

// ─── Medical Restriction Rules ───────────────────────────────────────────────

const MEDICAL_RESTRICTION_RULES: Record<string, string> = {
  控糖: "限制精制碳水和添加糖，优先低GI食材，控制主食分量",
  低盐: "每餐钠摄入<2g，避免腌制/高钠食品，少放酱油和味精",
  低嘌呤: "避免内脏、浓汤、啤酒，限制红肉和海鲜",
  少辛辣: "避免辣椒、花椒等强刺激性调料，使用温和调味",
  低脂: "限制油炸食品和动物脂肪，优先蒸煮炖等少油做法",
  高纤维: "增加蔬菜、杂粮和豆类摄入，每餐保证膳食纤维",
  低蛋白: "限制蛋白质总量，适用于肾功能不全患者",
};

function buildMedicalRestrictionConstraints(restrictions: string[]): string {
  const lines: string[] = [];
  for (const r of restrictions) {
    const rule = MEDICAL_RESTRICTION_RULES[r];
    if (rule) {
      lines.push(`【医嘱：${r}】${rule}`);
    } else {
      lines.push(`【医嘱：${r}】请严格遵守此限制`);
    }
  }
  return lines.join("\n");
}

// ─── Health Goal Soft Constraints ────────────────────────────────────────────

const GOAL_CONSTRAINTS: Record<string, string> = {
  减脂: "适度控制总热量，优先高蛋白+高纤维组合，减少精制碳水",
  控糖: "即使未诊断糖尿病，也应优先低GI食材，控制添加糖和精制碳水",
  控血压: "注意控盐，多选富含钾镁的食材（如香蕉、菠菜、坚果）",
  增肌: "提高蛋白质摄入比例，每餐保证优质蛋白来源",
  规律饮食: "三餐均衡，避免过量或过少，保持稳定的进餐节奏",
};

function buildGoalConstraints(goals: string[]): string {
  const lines: string[] = [];
  for (const g of goals) {
    const rule = GOAL_CONSTRAINTS[g];
    if (rule) {
      lines.push(`【健康目标：${g}】${rule}`);
    }
  }
  return lines.join("\n");
}

// ─── Allergen Post-Validation ─────────────────────────────────────────────────

export function checkAllergenInText(
  text: string,
  allergies: string[]
): string[] {
  const found: string[] = [];
  for (const allergen of allergies) {
    if (text.includes(allergen)) {
      found.push(allergen);
    }
  }
  return found;
}

// ─── Build Safety Constraint String (4-level priority) ──────────────────────

export function buildSafetyConstraints(ctx: UserHealthContext): string {
  const lines: string[] = [];

  // L1: Allergies — highest priority, absolute exclusion
  if (ctx.allergies.length > 0) {
    lines.push(
      `⚠️ 【L1-严重过敏原】绝对禁止出现在任何食材中：${ctx.allergies.join("、")}`
    );
  }

  // L2: Medical restrictions — structured constraints from doctor/health needs
  if (ctx.medicalRestrictions.length > 0) {
    lines.push(`⚠️ 【L2-医嘱限制】必须遵守以下限制：`);
    lines.push(buildMedicalRestrictionConstraints(ctx.medicalRestrictions));
  }

  // L3: Forbidden ingredients — user explicitly refuses
  if (ctx.forbiddenIngredients.length > 0) {
    lines.push(
      `⚠️ 【L3-绝对不吃】用户明确不接受以下食材：${ctx.forbiddenIngredients.join("、")}`
    );
  }

  // Chronic disease rules (triggered by diagnosis)
  const diseaseConstraints = getDiseaseConstraints(ctx.chronicDiseases);
  if (diseaseConstraints) {
    lines.push(diseaseConstraints);
  }

  // Health goal soft constraints (even without diagnosis)
  if (ctx.healthGoals.length > 0) {
    const goalConstraints = buildGoalConstraints(ctx.healthGoals);
    if (goalConstraints) {
      lines.push(`【健康目标导向建议】`);
      lines.push(goalConstraints);
    }
  }

  return lines.join("\n");
}
