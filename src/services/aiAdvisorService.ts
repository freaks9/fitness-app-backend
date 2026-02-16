
import { JAPANESE_FOOD_DATABASE } from '../data/japaneseFood';

interface PfcBalance {
    protein: number;
    fat: number;
    carbs: number;
}

interface DailyGoal {
    calories: number;
    pfc: PfcBalance;
}

export const analyzeMeals_RuleBased = (
    meals: any[],
    goals: DailyGoal,
    t: (key: string, params?: any) => string
): string[] => {
    const advice: string[] = [];

    // 1. Calculate Totals
    let totalCals = 0;
    let totalP = 0;
    let totalF = 0;
    let totalC = 0;

    meals.forEach(meal => {
        totalCals += (parseInt(meal.calories) || 0);
        totalP += (parseFloat(meal.protein) || 0);
        totalF += (parseFloat(meal.fat) || 0);
        totalC += (parseFloat(meal.carbs) || 0);
    });

    // 2. Calorie Check
    if (totalCals > goals.calories + 200) {
        advice.push(t('adviceCalorieOver'));
    } else if (totalCals < goals.calories - 500) {
        advice.push(t('adviceCalorieUnder'));
    } else {
        advice.push(t('adviceCalorieGood'));
    }

    // 3. Protein Check & Suggestion
    if (totalP < goals.pfc.protein * 0.8) {
        advice.push(t('adviceProteinLow'));
        // Suggest high protein food
        const highProteinFoods = JAPANESE_FOOD_DATABASE
            .filter(f => (f.protein || 0) > 10 && (f.calories < 300))
            .sort(() => 0.5 - Math.random()) // Shuffle
            .slice(0, 2);

        if (highProteinFoods.length > 0) {
            const foodNames = highProteinFoods.map(f => f.name).join('、');
            advice.push(t('adviceSuggestFood', { food: foodNames }));
        }
    }

    // 4. Fat Check
    if (totalF > goals.pfc.fat * 1.2) {
        advice.push(t('adviceFatHigh'));
    }

    // 5. Carbs Check
    if (totalC > goals.pfc.carbs * 1.2) {
        advice.push(t('adviceCarbHigh'));
    } else if (totalC < goals.pfc.carbs * 0.6) {
        advice.push(t('adviceCarbLow'));
    }

    // 6. Meal Frequency Check
    const hasBreakfast = meals.some(m => m.mealType === 'breakfast');

    if (!hasBreakfast) {
        advice.push(t('adviceSkipBreakfast'));
    }

    // General motivational quote if list consists only of "Good"
    if (advice.length <= 1 && totalCals > 0) {
        advice.push(t('advicePerfect'));
    }

    return advice;
};
