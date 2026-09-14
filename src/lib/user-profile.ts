/**
 * Unified user profile data access layer.
 * Single source of truth for all profile reads/writes.
 * Meal generation and safety checks ONLY read from UserProfile — never from SurveySession.
 */

import { prisma } from "@/lib/prisma";
import { parseJSON, serializeJSON } from "@/lib/utils";
import type { UserHealthContext } from "@/lib/safety";
import type { DietPreferences } from "@/lib/meal-prompts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserProfileData {
  id: string;
  userId: string;
  // basicInfo
  age: number | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  activityLevel: string | null;
  // healthMetrics
  bloodSugarMmol: number | null;
  bloodPressureSys: number | null;
  bloodPressureDia: number | null;
  bodyFatPercent: number | null;
  uricAcidUmol: number | null;
  cholesterolMmol: number | null;
  chronicDiseases: string[];
  // dietaryRestrictions (4-level)
  allergies: string[];
  medicalRestrictions: string[];
  forbiddenIngredients: string[];
  avoidIngredients: string[];
  doctorNotes: string | null;
  // dietaryPreferences
  tastePref: string[];
  cuisinePref: string[];
  dietStyle: string | null;
  staplePreference: string | null;
  proteinPreference: string[];
  cookingMethodPref: string[];
  // lifestyleContext
  budgetPerMeal: number | null;
  cookingAbility: string | null;
  maxCookTimeMinutes: number | null;
  usualDiningPeople: number;
  // healthGoals
  healthGoals: string[];
}

export interface ProfileCompleteness {
  percentage: number;
  missingCriticalFields: string[];
  missingSections: string[];
}

// ─── JSON field list (fields stored as JSON strings in SQLite) ──────────────

const JSON_FIELDS = [
  "chronicDiseases",
  "allergies",
  "medicalRestrictions",
  "forbiddenIngredients",
  "avoidIngredients",
  "tastePref",
  "cuisinePref",
  "proteinPreference",
  "cookingMethodPref",
  "healthGoals",
] as const;

// ─── Parse raw DB row into typed UserProfileData ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseProfile(raw: any): UserProfileData {
  const parsed = { ...raw };
  for (const field of JSON_FIELDS) {
    parsed[field] = parseJSON<string[]>(raw[field], []);
  }
  return parsed as UserProfileData;
}

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getUserProfileRaw(
  userId: string
): Promise<UserProfileData | null> {
  const row = await prisma.userProfile.findUnique({
    where: { userId },
  });
  if (!row) return null;
  return parseProfile(row);
}

/**
 * Infer a default dietStyle from health goals, medical restrictions, and chronic diseases.
 * Used when user hasn't explicitly set a diet style (e.g., before AI preference survey).
 */
export function inferDietStyle(profile: UserProfileData): string {
  const goals = profile.healthGoals;
  const diseases = profile.chronicDiseases;
  const restrictions = profile.medicalRestrictions;

  if (diseases.includes("diabetes") || restrictions.includes("控糖") || goals.includes("控糖")) {
    return "low_carb";
  }
  if (goals.includes("减脂")) {
    return "balanced"; // balanced with calorie control (handled by TDEE)
  }
  if (goals.includes("增肌")) {
    return "high_protein";
  }
  return "balanced";
}

/**
 * Fetch user profile and build the context objects needed by meal generation.
 * This is the ONLY function that generate-plan and feedback routes should use.
 */
export async function getUserProfile(userId: string): Promise<{
  healthCtx: UserHealthContext;
  dietCtx: DietPreferences;
  raw: UserProfileData;
} | null> {
  const profile = await getUserProfileRaw(userId);
  if (!profile) return null;

  const healthCtx: UserHealthContext = {
    age: profile.age,
    gender: profile.gender,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    targetWeightKg: profile.targetWeightKg,
    activityLevel: profile.activityLevel,
    allergies: profile.allergies,
    chronicDiseases: profile.chronicDiseases,
    medicalRestrictions: profile.medicalRestrictions,
    forbiddenIngredients: profile.forbiddenIngredients,
    healthGoals: profile.healthGoals,
  };

  const dietCtx: DietPreferences = {
    tastePref: profile.tastePref.length > 0 ? profile.tastePref : ["均衡"],
    cuisinePref: profile.cuisinePref.length > 0 ? profile.cuisinePref : ["中餐"],
    dietStyle: profile.dietStyle ?? inferDietStyle(profile),
    avoidIngredients: profile.avoidIngredients,
    budgetPerMeal: profile.budgetPerMeal ?? 30,
    cookingAbility: profile.cookingAbility ?? "basic",
    staplePreference: profile.staplePreference,
    proteinPreference: Array.isArray(profile.proteinPreference)
      ? profile.proteinPreference
      : profile.proteinPreference ? [profile.proteinPreference] : [],
    maxCookTimeMinutes: profile.maxCookTimeMinutes,
    cookingMethodPref: Array.isArray(profile.cookingMethodPref) ? profile.cookingMethodPref : [],
    usualDiningPeople: profile.usualDiningPeople ?? 1,
  };

  return { healthCtx, dietCtx, raw: profile };
}

// ─── Write (partial upsert) ─────────────────────────────────────────────────

export async function upsertUserProfile(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): Promise<UserProfileData> {
  // Serialize JSON array fields before writing
  const dbData = { ...data };
  for (const field of JSON_FIELDS) {
    if (field in dbData && Array.isArray(dbData[field])) {
      dbData[field] = serializeJSON(dbData[field]);
    }
  }

  const row = await prisma.userProfile.upsert({
    where: { userId },
    update: dbData,
    create: { userId, ...dbData },
  });

  return parseProfile(row);
}

// ─── Profile Completeness ───────────────────────────────────────────────────

const CRITICAL_FIELDS = ["age", "gender", "heightCm", "weightKg"] as const;
const SAFETY_FIELDS = ["allergies", "chronicDiseases"] as const;
const QUALITY_FIELDS = [
  "tastePref",
  "cookingAbility",
  "healthGoals",
  "budgetPerMeal",
  "dietStyle",
] as const;

const SECTION_CHECKS: Record<string, (p: UserProfileData) => boolean> = {
  basicInfo: (p) =>
    p.age != null && p.gender != null && p.heightCm != null && p.weightKg != null,
  healthMetrics: (p) =>
    p.bloodSugarMmol != null ||
    p.bloodPressureSys != null ||
    p.chronicDiseases.length > 0,
  dietaryRestrictions: (p) =>
    p.allergies.length > 0 ||
    p.medicalRestrictions.length > 0 ||
    p.forbiddenIngredients.length > 0,
  dietaryPreferences: (p) =>
    p.tastePref.length > 0 || p.cuisinePref.length > 0 || p.dietStyle != null,
  lifestyleContext: (p) =>
    p.budgetPerMeal != null || p.cookingAbility != null,
  healthGoals: (p) => p.healthGoals.length > 0,
};

function isFieldFilled(profile: UserProfileData, field: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val = (profile as any)[field];
  if (val == null) return false;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

export function getProfileCompleteness(
  profile: UserProfileData
): ProfileCompleteness {
  const allFields = [
    ...CRITICAL_FIELDS,
    ...SAFETY_FIELDS,
    ...QUALITY_FIELDS,
  ];

  const filledCount = allFields.filter((f) =>
    isFieldFilled(profile, f)
  ).length;

  const missingCriticalFields = CRITICAL_FIELDS.filter(
    (f) => !isFieldFilled(profile, f)
  ).map(String);

  const missingSections = Object.entries(SECTION_CHECKS)
    .filter(([, check]) => !check(profile))
    .map(([name]) => name);

  return {
    percentage: Math.round((filledCount / allFields.length) * 100),
    missingCriticalFields,
    missingSections,
  };
}
