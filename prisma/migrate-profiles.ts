/**
 * One-time data migration script: copies data from legacy 3-table profile
 * (BasicProfile, HealthProfile, DietProfile) into unified UserProfile.
 *
 * Run with: npx tsx prisma/migrate-profiles.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeJSON(value: unknown): string {
  return JSON.stringify(value);
}

/** Medical restriction keywords — items matching these go to medicalRestrictions */
const MEDICAL_KEYWORDS = [
  "控糖", "低糖", "糖", "低盐", "盐", "低嘌呤", "嘌呤",
  "低脂", "少油", "少辛辣", "辛辣", "清淡", "医嘱", "医生",
  "不能吃", "禁食", "生冷", "清真", "素食", "忌",
];

function classifyRestriction(item: string): "medical" | "ingredient" {
  const lower = item.toLowerCase();
  for (const kw of MEDICAL_KEYWORDS) {
    if (lower.includes(kw)) return "medical";
  }
  // Short items (≤4 chars) that look like ingredient names → ingredient
  if (item.length <= 4) return "ingredient";
  // Longer items default to medical (likely a description/instruction)
  return "medical";
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  console.log(`Found ${users.length} users to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    // Check if already migrated
    const existing = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // Fetch legacy profiles
    const [basic, health, diet] = await Promise.all([
      prisma.basicProfile.findUnique({ where: { userId: user.id } }),
      prisma.healthProfile.findUnique({ where: { userId: user.id } }),
      prisma.dietProfile.findUnique({ where: { userId: user.id } }),
    ]);

    // Skip users with no profile data at all
    if (!basic && !health && !diet) {
      skipped++;
      continue;
    }

    // Parse old JSON fields
    const oldAllergies = parseJSON<string[]>(health?.allergies, []);
    const oldChronicDiseases = parseJSON<string[]>(health?.chronicDiseases, []);
    const oldDietaryTaboos = parseJSON<string[]>(health?.dietaryTaboos, []);
    const oldHardConstraints = parseJSON<string[]>(diet?.hardConstraints, []);
    const oldAvoidIngredients = parseJSON<string[]>(diet?.avoidIngredients, []);
    const oldTastePref = parseJSON<string[]>(diet?.tastePref, []);
    const oldCuisinePref = parseJSON<string[]>(diet?.cuisinePref, []);

    // Classify old restrictions into medicalRestrictions vs forbiddenIngredients
    const allRestrictions = [...new Set([...oldDietaryTaboos, ...oldHardConstraints])];
    const medicalRestrictions: string[] = [];
    const forbiddenIngredients: string[] = [];

    for (const item of allRestrictions) {
      if (!item.trim()) continue;
      if (classifyRestriction(item) === "medical") {
        medicalRestrictions.push(item.trim());
      } else {
        forbiddenIngredients.push(item.trim());
      }
    }

    // Create unified profile
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        // basicInfo
        age: basic?.age ?? null,
        gender: basic?.gender ?? null,
        heightCm: basic?.heightCm ?? null,
        weightKg: basic?.weightKg ?? null,
        targetWeightKg: basic?.targetWeightKg ?? null,
        activityLevel: basic?.activityLevel ?? null,
        // healthMetrics
        bloodSugarMmol: health?.bloodSugarMmol ?? null,
        bloodPressureSys: health?.bloodPressureSys ?? null,
        bloodPressureDia: health?.bloodPressureDia ?? null,
        bodyFatPercent: health?.bodyFatPercent ?? null,
        uricAcidUmol: health?.uricAcidUmol ?? null,
        cholesterolMmol: health?.cholesterolMmol ?? null,
        chronicDiseases: serializeJSON(oldChronicDiseases),
        // dietaryRestrictions (4-level)
        allergies: serializeJSON(oldAllergies),
        medicalRestrictions: serializeJSON(medicalRestrictions),
        forbiddenIngredients: serializeJSON(forbiddenIngredients),
        avoidIngredients: serializeJSON(oldAvoidIngredients),
        doctorNotes: health?.doctorNotes ?? null,
        // dietaryPreferences
        tastePref: serializeJSON(oldTastePref),
        cuisinePref: serializeJSON(oldCuisinePref),
        dietStyle: diet?.dietStyle ?? null,
        staplePreference: null,
        proteinPreference: serializeJSON([]),
        cookingMethodPref: serializeJSON([]),
        // lifestyleContext
        budgetPerMeal: diet?.budgetPerMeal ?? null,
        cookingAbility: diet?.cookingAbility ?? null,
        maxCookTimeMinutes: null,
        // healthGoals
        healthGoals: serializeJSON([]),
      },
    });

    migrated++;
  }

  console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
