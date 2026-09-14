export const SURVEY_SYSTEM_PROMPT = `你是一位中文饮食偏好采集助手，不是医生，也不是正式问卷机器人。

你的任务是：
在用户已经完成基础健康建档之后，用自然、简洁、不重复的中文对话，补充收集"饮食偏好与日常用餐习惯"信息，用于后续生成更符合用户口味的中国家常菜谱。

你必须遵守以下规则：

1. 不要重复询问用户已经通过表单填写过的核心健康信息。
不要再问：年龄、性别、身高、体重、目标体重、活动水平、血糖、血压、慢病、过敏、医嘱限制、绝对不吃、医嘱备注、健康目标

2. 你只负责采集以下偏好字段：
- tastePref：口味偏好
- cuisinePref：菜系偏好
- dietStyle：饮食风格
- staplePreference：主食偏好
- proteinPreference：蛋白偏好（可多选）
- budgetPerMeal：每餐预算
- cookingAbility：烹饪能力
- maxCookTimeMinutes：可接受做饭时长
- cookingMethodPref：偏好的烹饪方式（可多选）
- usualDiningPeople：日常几个人吃

3. 问题要像真实聊天，不要像调查问卷。
一次最多问 1–2 个问题。优先问最能影响菜谱风格和份量的问题。

4. 你的问题要有生活感，避免抽象词。
例如：
- 你平时更喜欢清淡一点，还是咸香下饭一点？
- 你做饭时更愿意炒、炖、蒸，还是煮点汤面这种简单的？
- 平时一般是自己吃，还是两个人、三个人一起吃？

5. 你必须特别重视 cookingMethodPref 和 usualDiningPeople，
因为它们会直接影响菜谱风格、菜数、分量、是否推荐一锅出/汤面/套餐搭配。

6. 如果用户回答模糊，你可以帮他归类，但不要擅自编造。

7. 当信息足够时，输出结构化结果，不要继续追问。
输出格式（不添加其他文字）：

[SURVEY_COMPLETE]
{"tastePref":["咸香","微辣"],"cuisinePref":["中餐"],"dietStyle":"balanced","staplePreference":"rice","proteinPreference":["猪肉","鸡肉"],"budgetPerMeal":25,"cookingAbility":"basic","maxCookTimeMinutes":30,"cookingMethodPref":["炒","炖","煮"],"usualDiningPeople":2,"avoidIngredients":["香菜"],"notes":""}

字段说明：
- tastePref: 口味偏好（数组，如 ["清淡","咸香","微辣"]）
- cuisinePref: 菜系偏好（数组）
- dietStyle: balanced/low_carb/vegetarian/high_protein
- staplePreference: rice/noodles/mixed/grains
- proteinPreference: 数组，如 ["猪肉","鸡肉","鱼虾"]
- budgetPerMeal: 每餐预算（数字，元）
- cookingAbility: none/basic/intermediate/advanced
- maxCookTimeMinutes: 最长做饭时间（数字，分钟）
- cookingMethodPref: 数组，如 ["炒","炖","蒸","煮","焖","凉拌","煎","汤羹","一锅出"]
- usualDiningPeople: 日常几人吃（数字）
- avoidIngredients: 不喜欢但非过敏的食材（数组）

开场白：和用户打个招呼，说"我来了解一下您的口味和用餐习惯，好让推荐更合心意"，然后从口味和做饭方式开始聊。`;

/**
 * Build a context-aware survey prompt. Only checks preference fields.
 */
export function buildSurveyPromptWithContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: Record<string, any> | null
): string {
  if (!profile) return SURVEY_SYSTEM_PROMPT;

  const prefFields: Array<{ key: string; label: string }> = [
    { key: "tastePref", label: "口味偏好" },
    { key: "cuisinePref", label: "菜系偏好" },
    { key: "avoidIngredients", label: "不喜欢的食材" },
    { key: "staplePreference", label: "主食偏好" },
    { key: "proteinPreference", label: "蛋白质偏好" },
    { key: "budgetPerMeal", label: "每餐预算" },
    { key: "cookingAbility", label: "烹饪能力" },
    { key: "maxCookTimeMinutes", label: "做饭时间" },
    { key: "cookingMethodPref", label: "烹饪方式偏好" },
    { key: "usualDiningPeople", label: "用餐人数" },
  ];

  const known: string[] = [];
  const missing: string[] = [];

  for (const { key, label } of prefFields) {
    const val = profile[key];
    const isEmpty = val == null || (Array.isArray(val) && val.length === 0) || val === "" || val === 0;
    if (isEmpty) {
      missing.push(label);
    } else {
      const display = Array.isArray(val) ? val.join("、") : String(val);
      known.push(`${label}：${display}`);
    }
  }

  if (missing.length === 0) {
    return SURVEY_SYSTEM_PROMPT + `\n\n【该用户偏好已基本完整】\n已有偏好：\n${known.map(f => `- ${f}`).join("\n")}\n\n请简单确认是否有想更新的，没有就直接输出 [SURVEY_COMPLETE]。`;
  }

  if (known.length > 0) {
    return SURVEY_SYSTEM_PROMPT + `\n\n【已有部分偏好，请只补充缺失的】\n已有（不要再问）：\n${known.map(f => `- ${f}`).join("\n")}\n\n还需了解：\n${missing.map(f => `- ${f}`).join("\n")}\n\n开场白："我看到您已经有一些偏好了，我再补充几个问题"，然后直接从缺失项开始。`;
  }

  return SURVEY_SYSTEM_PROMPT;
}

export interface SurveyMessage {
  role: "user" | "assistant";
  content: string;
}

/** Survey result — only preference/lifestyle fields */
export interface SurveyResult {
  tastePref?: string[];
  cuisinePref?: string[];
  avoidIngredients?: string[];
  dietStyle?: string | null;
  staplePreference?: string | null;
  proteinPreference?: string[];
  budgetPerMeal?: number | null;
  cookingAbility?: string | null;
  maxCookTimeMinutes?: number | null;
  cookingMethodPref?: string[];
  usualDiningPeople?: number | null;
  notes?: string | null;
}

export function extractSurveyResult(text: string): SurveyResult | null {
  const completeMarker = "[SURVEY_COMPLETE]";
  const idx = text.indexOf(completeMarker);
  if (idx === -1) return null;

  const jsonPart = text.slice(idx + completeMarker.length).trim();
  try {
    const match = jsonPart.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as SurveyResult;
  } catch {
    return null;
  }
}

export function extractHardConstraints(text: string): string[] {
  const constraints: string[] = [];
  const regex = /\[HARD_CONSTRAINT:\s*([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    constraints.push(match[1].trim());
  }
  return constraints;
}

// Quick reply chips based on the last AI message
export function getQuickReplySuggestions(aiMessage: string): string[] {
  const sentences = aiMessage.split(/[。！？\n]/).filter((s) => s.trim().length > 0);
  const lastSentence = (sentences[sentences.length - 1] ?? "").toLowerCase();
  const prevSentence = (sentences[sentences.length - 2] ?? "").toLowerCase();
  const combined = prevSentence + lastSentence;

  if (/口味|清淡|咸香|辛辣/.test(combined)) {
    return ["清淡为主", "咸香下饭", "微辣", "口味多样"];
  }
  if (/做饭.*方式|怎么做|炒.*炖.*蒸|烹饪方式/.test(combined)) {
    return ["炒菜为主", "喜欢炖煮", "蒸煮为主", "都可以"];
  }
  if (/几个人|自己吃|一个人|两个人|几口人/.test(combined)) {
    return ["就我自己", "两个人", "三个人", "四人及以上"];
  }
  if (/菜系|料理/.test(combined)) {
    return ["主要吃中餐", "中餐日韩都喜欢", "什么菜系都吃"];
  }
  if (/主食|米饭|面/.test(combined)) {
    return ["米饭为主", "面食为主", "杂粮为主", "都可以"];
  }
  if (/蛋白|肉|荤/.test(combined)) {
    return ["猪肉鸡肉为主", "鱼虾为主", "豆制品为主", "都吃"];
  }
  if (/预算|花多少|每餐.*钱/.test(combined)) {
    return ["15元以内", "15-30元", "30-50元", "50元以上"];
  }
  if (/烹饪|厨艺|做饭.*水平/.test(combined) && !/时间|多久/.test(combined)) {
    return ["完全不会", "基础水平", "比较熟练", "厨艺不错"];
  }
  if (/做饭.*时间|多[久长].*做|花.*时间/.test(combined)) {
    return ["15分钟以内", "30分钟以内", "1小时以内", "不限时间"];
  }
  if (/不喜欢|不爱吃|忌口/.test(combined)) {
    return ["没有特别忌口", "不吃香菜", "不吃苦瓜", "不吃芹菜"];
  }
  if (/饮食风格|饮食习惯/.test(combined)) {
    return ["均衡饮食", "低碳减脂", "素食为主", "没有特别要求"];
  }

  return [];
}
