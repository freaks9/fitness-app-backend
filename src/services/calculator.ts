export interface UserProfile {
    gender: 'male' | 'female';
    age: number;
    heightCm: number;
    weightKg: number;
    activityLevel: '1.2' | '1.375' | '1.55' | '1.725' | '1.9'; // sedentary, light, moderate, active, veryActive
    targetWeightKg?: number;
    pfcRatio?: { p: number; f: number; c: number }; // Percentage (e.g. 20, 30, 50)
}

export interface CalculationResult {
    bmr: number;
    tdee: number;
    dailyCalorieGoal: number;
    pfcGoals: {
        protein: number; // grams
        fat: number; // grams
        carbs: number; // grams
    };
}

/**
 * Calculates BMR using the Harris-Benedict Equation (Revised 1984)
 */
export const calculateBMR = (profile: UserProfile): number => {
    const { gender, age, heightCm, weightKg } = profile;

    if (gender === 'male') {
        // Men: BMR = 88.362 + (13.397 × weight in kg) + (4.799 × height in cm) - (5.677 × age in years)
        return 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age);
    } else {
        // Women: BMR = 447.593 + (9.247 × weight in kg) + (3.098 × height in cm) - (4.330 × age in years)
        return 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);
    }
};

/**
 * Calculates Daily Calorie Goal and PFC breakdown
 */
export const calculateGoals = (profile: UserProfile): CalculationResult => {
    const bmr = calculateBMR(profile);
    const activityMultiplier = parseFloat(profile.activityLevel);
    const tdee = Math.round(bmr * activityMultiplier);

    // Default adjustment for weight loss/gain
    // If target weight is significantly lower, reduce calories by 500 (approx 0.5kg/week loss), min 1200
    // Simple logic for MVP: just use TDEE for maintenance, or TDEE - 500 for loss if target < current
    let dailyCalorieGoal = tdee;
    if (profile.targetWeightKg && profile.targetWeightKg < profile.weightKg) {
        dailyCalorieGoal = Math.max(1200, tdee - 500); // Deficit
    } else if (profile.targetWeightKg && profile.targetWeightKg > profile.weightKg) {
        dailyCalorieGoal = tdee + 300; // Surplus
    }

    // PFC Calculation
    // 1g Protein = 4kcal, 1g Fat = 9kcal, 1g Carbs = 4kcal
    const ratio = profile.pfcRatio || { p: 20, f: 30, c: 50 }; // Default: P:20%, F:30%, C:50%

    const pfcGoals = {
        protein: Math.round((dailyCalorieGoal * (ratio.p / 100)) / 4),
        fat: Math.round((dailyCalorieGoal * (ratio.f / 100)) / 9),
        carbs: Math.round((dailyCalorieGoal * (ratio.c / 100)) / 4),
    };

    return {
        bmr: Math.round(bmr),
        tdee,
        dailyCalorieGoal,
        pfcGoals
    };
};
