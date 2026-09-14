import {
  UserHealthContext,
  buildSafetyConstraints,
  calculateTDEE,
} from "@/lib/safety";
import { getCurrentSeason } from "@/lib/utils";

export interface DietPreferences {
  tastePref: string[];
  cuisinePref: string[];
  dietStyle: string;
  avoidIngredients: string[];
  budgetPerMeal: number;
  cookingAbility: string;
  staplePreference?: string | null;
  proteinPreference: string[];
  maxCookTimeMinutes?: number | null;
  cookingMethodPref: string[];
  usualDiningPeople: number;
}

export interface MealGenerationContext {
  health: UserHealthContext;
  diet: DietPreferences;
  date: string;
}

/** Summary of an already-generated meal, passed to subsequent slots for dedup */
export interface GeneratedMealSummary {
  slot: string;
  mealTitle: string;
  mainProtein: string;
  mainCookMethod: string;
  mainTaste: string;
}

const slotLabels: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
};

const slotRatios: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.40,
  dinner: 0.35,
};

// ─── Meal structure rules by dining people ──────────────────────────────────

function getMealStructureGuide(people: number, slot: string): string {
  if (slot === "breakfast") {
    if (people === 1) return "一人份早餐：粥/面/蛋饼/包子 + 鸡蛋/牛奶等，简单快捷";
    return `${people}人份早餐：可以稍丰富，粥+小菜+主食，或面点+豆浆等`;
  }
  if (people === 1) return "一人份：优先盖饭/拌面/焖饭/汤面/一菜一主食/一锅出，简单实用";
  if (people === 2) return "两人份：1-2个菜 + 主食，或1主菜 + 1配菜/汤 + 主食";
  if (people === 3) return "三人份：2-3个菜，如1荤1素1汤 + 主食";
  return `${people}人份：3-4个菜，如2荤1素1汤 + 主食，菜量适当增大`;
}

// ─── Cooking ability label ──────────────────────────────────────────────────

function getCookingLabel(ability?: string): string {
  switch (ability) {
    case "none": return "完全不会做饭，只能做最简单的";
    case "basic": return "会做简单家常菜";
    case "intermediate": return "可以完成一般家庭烹饪";
    case "advanced": return "烹饪能力较强";
    default: return "普通家庭烹饪水平";
  }
}

// ─── Diet style label ───────────────────────────────────────────────────────

function getDietStyleLabel(style?: string): string {
  switch (style) {
    case "balanced": return "均衡饮食";
    case "low_carb": return "低碳饮食";
    case "high_protein": return "高蛋白饮食";
    case "vegetarian": return "素食";
    case "vegan": return "纯素";
    default: return style || "均衡饮食";
  }
}

// ─── Build the common rules section ─────────────────────────────────────────

function buildCoreRules(): string {
  return `
【核心原则】
1. 安全第一：严格遵守过敏、慢病、禁忌和健康限制
2. 中国餐感真实性：推荐必须像中国用户日常真正会吃、愿意吃的饭
3. 偏好必须影响结果：用户的口味、烹饪方式、主食蛋白偏好必须直接体现在菜的选择上，不能只体现在推荐理由里
4. 营养优化放在第四位：在不破坏正常中国餐感的前提下，尽量满足热量和营养目标

【禁止事项】
- 禁止输出像"高蛋白能量碗""低脂蔬食拼盘""功能型暖碗""综合蔬食盒"这类 AI 味重的名字
- 禁止输出健身餐、轻食拼盘、功能餐式内容
- 禁止自创不存在的菜名
- 菜名必须自然，像真实中国家常菜

【偏好-结果对应关系（必须遵守）】
- 喜欢咸香 → 优先酱香、蒜香、红烧、小炒、干煸、回锅类
- 喜欢清淡 → 优先清蒸、白灼、炖煮、汤羹、鲜香、少油类
- 喜欢辛辣 → 优先麻辣、香辣、酸辣、干锅类
- 偏好炒 → 不要总给蒸、凉拌
- 偏好炖 → 不要总给快炒
- 偏好蒸煮 → 不要总给油炒、煎炸
- 偏好米饭 → 午晚餐以饭菜搭配为主
- 偏好面食 → 可推荐汤面、拌面、焖面、饺子等
`.trim();
}

// ─── Build user context section ─────────────────────────────────────────────

function buildUserSection(ctx: MealGenerationContext, slot: string): string {
  const targets = calculateTDEE(ctx.health);
  const safetyConstraints = buildSafetyConstraints(ctx.health);
  const season = getCurrentSeason();
  const ratio = slotRatios[slot] ?? 0.35;
  const targetCalories = Math.round(targets.dailyCalories * ratio);

  const d = ctx.diet;
  return `
${safetyConstraints ? `【安全约束 - 必须严格遵守】\n${safetyConstraints}\n` : ""}

【用户基本信息】
- 性别：${ctx.health.gender === "female" ? "女" : ctx.health.gender === "male" ? "男" : "未知"}
- 年龄：${ctx.health.age ?? "未知"}岁

【用户偏好（必须直接影响选菜）】
- 口味偏好：${d.tastePref.join("、")}
- 菜系偏好：${d.cuisinePref.join("、")}
- 饮食风格：${getDietStyleLabel(d.dietStyle)}
- 不喜欢的食材（尽量避免）：${d.avoidIngredients.join("、") || "无"}
${d.staplePreference ? `- 主食偏好：${d.staplePreference}` : ""}
- 蛋白偏好：${d.proteinPreference.length > 0 ? d.proteinPreference.join("、") : "不限"}
- 烹饪方式偏好：${d.cookingMethodPref.length > 0 ? d.cookingMethodPref.join("、") : "不限"}

【用餐条件】
- 日常用餐人数：${d.usualDiningPeople}人
- 每餐预算：${d.budgetPerMeal}元以内
- 烹饪能力：${getCookingLabel(d.cookingAbility)}
${d.maxCookTimeMinutes ? `- 做饭时间限制：${d.maxCookTimeMinutes}分钟以内` : ""}

【本餐信息】
- 餐次：${slotLabels[slot] ?? slot}
- 热量目标：约${targetCalories} kcal
- 季节：${season}
- 日期：${ctx.date}

【本餐结构要求】
${getMealStructureGuide(d.usualDiningPeople, slot)}
`.trim();
}

// ─── Build dedup constraints from already-generated meals ───────────────────

function buildDedupConstraints(previousMeals: GeneratedMealSummary[]): string {
  if (previousMeals.length === 0) return "";

  const lines: string[] = ["【去重约束 - 必须遵守，不可重复】"];
  for (const m of previousMeals) {
    lines.push(`- 今日${slotLabels[m.slot] ?? m.slot}已选：${m.mealTitle}（蛋白：${m.mainProtein}，做法：${m.mainCookMethod}，味型：${m.mainTaste}）`);
  }
  lines.push("");
  lines.push("你必须确保本餐：");
  lines.push("- 主蛋白不与以上已选餐重复");
  lines.push("- 主要烹饪方式不与以上已选餐重复");
  lines.push("- 主味型不与以上已选餐过于相似");
  lines.push("- 不要推荐和以上菜名相同或高度相似的菜（如青椒肉丝 vs 青椒牛肉丝）");

  return lines.join("\n");
}

// ─── Output format template ─────────────────────────────────────────────────

const OUTPUT_FORMAT = `
【输出格式 - 严格输出 JSON，不要 markdown 代码块，不要额外文字】
{
  "mealTitle": "整顿饭名称，如：番茄牛腩配米饭和蒜蓉西兰花",
  "mealType": "中式家常午餐",
  "servings": 2,
  "mealStructure": "一荤一素一主食",
  "recommendReason": "50字以内，说明为什么这顿饭适合用户，引用具体偏好",
  "mainProtein": "牛肉",
  "mainCookMethod": "炖",
  "mainTaste": "咸香",
  "dishes": [
    {
      "dishName": "番茄炖牛腩",
      "role": "主菜",
      "cookMethod": "炖",
      "ingredients": [{"name":"牛腩","amount":"300","unit":"克"},{"name":"番茄","amount":"2","unit":"个"}],
      "steps": [{"step":1,"description":"牛腩切块焯水"},{"step":2,"description":"番茄切块炒出汁"}]
    },
    {
      "dishName": "蒜蓉西兰花",
      "role": "配菜",
      "cookMethod": "炒",
      "ingredients": [{"name":"西兰花","amount":"200","unit":"克"}],
      "steps": [{"step":1,"description":"西兰花焯水，蒜末爆香翻炒"}]
    },
    {
      "dishName": "米饭",
      "role": "主食",
      "cookMethod": "煮",
      "ingredients": [{"name":"大米","amount":"150","unit":"克"}],
      "steps": [{"step":1,"description":"淘米后加水电饭煲蒸熟"}]
    }
  ],
  "nutrition": {"calories":650,"proteinG":35,"carbsG":70,"fatG":18,"fiberG":6},
  "tasteTags": ["咸香","鲜香"],
  "alternatives": [
    {
      "mealTitle": "备选整顿饭名称",
      "mealStructure": "一菜一汤一主食",
      "reason": "为什么也适合",
      "difference": "和主推荐相比的主要差异，如换了蛋白/做法/味型"
    }
  ]
}`;

// ─── Main prompt builder: single meal with dedup context ────────────────────

export function buildSingleMealPrompt(
  ctx: MealGenerationContext,
  slot: "breakfast" | "lunch" | "dinner",
  previousMeals: GeneratedMealSummary[] = []
): { system: string; user: string } {
  const system = `
你是一位熟悉中国家庭饮食习惯的健康饮食规划师。
你的任务是为用户推荐一顿适合今天${slotLabels[slot]}的中国家常餐。
生成的是"一顿完整的餐"，不是单道孤立菜。

${buildCoreRules()}

${buildUserSection(ctx, slot)}

${buildDedupConstraints(previousMeals)}

【备选方案要求】
- 提供 2 个备选整顿饭方案
- 备选必须和主推荐在主蛋白、做法、或味型上有明显差异
- 备选也要符合用户偏好和安全约束

${OUTPUT_FORMAT}
`.trim();

  const user = `请为用户推荐一顿${slotLabels[slot]}。要求：像真实中国家常饭，符合用户口味和烹饪方式偏好，${ctx.diet.usualDiningPeople}人份，不要和今天已有的餐重复。`;

  return { system, user };
}

// ─── Swap meal prompt (for feedback-triggered regeneration) ─────────────────

export function buildSwapMealPrompt(
  ctx: MealGenerationContext,
  slot: "breakfast" | "lunch" | "dinner",
  currentDishName: string,
  feedbackReason?: string
): { system: string; user: string } {
  const system = `
你是一位熟悉中国家庭饮食习惯的健康饮食规划师。
用户对当前${slotLabels[slot]}不满意，请重新推荐一顿替代餐。

${buildCoreRules()}

${buildUserSection(ctx, slot)}

【替换要求】
- 当前菜品：${currentDishName}
- 用户反馈：${feedbackReason || "想换一道"}
- 新推荐必须和当前菜品明显不同（不同蛋白、不同做法或不同味型）
- 仍要符合用户偏好和安全约束

${OUTPUT_FORMAT}
`.trim();

  const user = `请重新推荐一顿${slotLabels[slot]}，替换掉"${currentDishName}"。要求明显不同，${ctx.diet.usualDiningPeople}人份。`;

  return { system, user };
}
