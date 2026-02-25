import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { prisma } from '../db';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

const SYSTEM_PROMPT = `
あなたはプロの管理栄養士かつAIコーチです。
ユーザーの当日の食事ログ（料理名、栄養素）を分析し、健康的な生活のためのパーソナライズされたアドバイスを3〜5個提供してください。
回答は必ず以下のJSONフォーマットで、簡潔な日本語で出力してください。

フォーマット:
{
  "advice": [
    "アドバイス1: 内容",
    "アドバイス2: 内容",
    "アドバイス3: 内容"
  ]
}

アドバイスのポイント:
1. 不足している栄養素（タンパク質、ビタミンなど）があれば指摘する。
2. 摂りすぎているもの（塩分、脂質、カロリーなど）があれば、具体的な改善案を出す。
3. 次の食事や明日の食事で意識すべき食材を提案する。
4. ポジティブで励みになる口調を心がける。
`;

export const generateDailyAdvice = async (userId: string, dateStr?: string): Promise<string[]> => {
    if (!API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    try {
        // Use provided dateStr or default to server's today
        const targetDate = dateStr || new Date().toISOString().split('T')[0];

        // Parse date for range query
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch logs for the specific date
        const logs = await prisma.mealLog.findMany({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                foodProduct: true
            }
        });

        if (logs.length === 0) {
            return ["まだこの日の食事記録がありません。食事を記録してアドバイスを受け取りましょう！"];
        }

        const mealSummary = logs.map((l: any) => ({
            name: l.foodProduct.name,
            calories: l.foodProduct.calories * (l.quantity / 100),
            protein: l.foodProduct.protein * (l.quantity / 100),
            fat: l.foodProduct.fat * (l.quantity / 100),
            carbs: l.foodProduct.carbs * (l.quantity / 100)
        }));

        const prompt = `今日のユーザーの食事データ: ${JSON.stringify(mealSummary)}\nこれに基づいたアドバイスをお願いします。`;

        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
        const result = await model.generateContent([SYSTEM_PROMPT, prompt]);
        const response = await result.response;
        const text = response.text();

        // Parse JSON safely
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.advice || ["アドバイスの生成に失敗しました。"];
        }

        return ["アドバイスの解析に失敗しました。"];

    } catch (error: any) {
        console.error("AI Advisor Error:", error.message);
        return ["AIアドバイザーが一時的に利用できません。時間をおいて再度お試しください。"];
    }
};
