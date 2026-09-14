import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  identifier: z
    .string()
    .min(1, "请输入手机号或邮箱")
    .refine(
      (v) => /^1[3-9]\d{9}$/.test(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "请输入有效的手机号或邮箱"
    ),
  password: z.string().min(6, "密码至少6位").max(100),
  name: z.string().min(1, "请输入姓名").max(50).optional(),
});

export const LoginSchema = z.object({
  identifier: z.string().min(1, "请输入手机号或邮箱"),
  password: z.string().min(1, "请输入密码"),
});

// ─── Unified User Profile ────────────────────────────────────────────────────
// All fields optional/nullable to support partial updates from any source
// (manual form, AI survey, or individual field edits)

export const UserProfileSchema = z.object({
  // basicInfo
  age: z.number().int().min(1).max(120).optional().nullable(),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  heightCm: z.number().min(50).max(300).optional().nullable(),
  weightKg: z.number().min(10).max(500).optional().nullable(),
  targetWeightKg: z.number().min(10).max(500).optional().nullable(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional()
    .nullable(),

  // healthMetrics
  bloodSugarMmol: z.number().min(0).max(30).optional().nullable(),
  bloodPressureSys: z.number().int().min(60).max(250).optional().nullable(),
  bloodPressureDia: z.number().int().min(40).max(150).optional().nullable(),
  bodyFatPercent: z.number().min(0).max(80).optional().nullable(),
  uricAcidUmol: z.number().min(0).max(1000).optional().nullable(),
  cholesterolMmol: z.number().min(0).max(20).optional().nullable(),
  chronicDiseases: z.array(z.string()).optional(),

  // dietaryRestrictions (4-level severity)
  allergies: z.array(z.string()).optional(),
  medicalRestrictions: z.array(z.string()).optional(),
  forbiddenIngredients: z.array(z.string()).optional(),
  avoidIngredients: z.array(z.string()).optional(),
  doctorNotes: z.string().max(500).optional().nullable(),

  // dietaryPreferences
  tastePref: z.array(z.string()).optional(),
  cuisinePref: z.array(z.string()).optional(),
  dietStyle: z.string().optional().nullable(),
  staplePreference: z.string().optional().nullable(),
  proteinPreference: z.array(z.string()).optional(),
  cookingMethodPref: z.array(z.string()).optional(),

  // lifestyleContext
  budgetPerMeal: z.number().int().min(5).max(500).optional().nullable(),
  cookingAbility: z.string().optional().nullable(),
  maxCookTimeMinutes: z.number().int().min(5).max(180).optional().nullable(),
  usualDiningPeople: z.number().int().min(1).max(10).optional().nullable(),

  // healthGoals
  healthGoals: z.array(z.string()).optional(),
});

// ─── Survey Extracted Result ─────────────────────────────────────────────────
// Matches the full structure AI can extract from conversation.
// Same shape as UserProfileSchema but used for survey-specific validation.

export const SurveyExtractedResultSchema = UserProfileSchema.extend({
  notes: z.string().optional().nullable(),
});

// ─── Meal Feedback ────────────────────────────────────────────────────────────

export const MealFeedbackSchema = z.object({
  type: z.enum(["ate", "dislike", "too_complex", "too_expensive", "swap"]),
  note: z.string().max(200).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UserProfileInput = z.infer<typeof UserProfileSchema>;
export type SurveyExtractedResult = z.infer<typeof SurveyExtractedResultSchema>;
export type MealFeedbackInput = z.infer<typeof MealFeedbackSchema>;
