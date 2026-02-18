import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Ensure API Key exists
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is missing in .env file. AI Analysis will fail.");
}

const genAI = new GoogleGenerativeAI(API_KEY || '');

// Interface for the structured response
export interface MealAnalysisResult {
    food_name: string;
    estimated_weight_g: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    analysis_confidence: number;
    description: string;
}

const SYSTEM_PROMPT = `
あなたはプロの管理栄養士です。
与えられた画像から食事の内容を非常に精密に分析し、以下の仕様で回答してください。

1. **食品・料理の特定**: 画像内の個々の食材や料理名を正確に特定してください。
2. **分量の推定**: 皿のサイズや食材の形状から、摂取重量(g)を推測してください。日本食（ご飯一膳、味噌汁一杯など）の一般的なポーションを参考にしてください。
3. **栄養計算**: 特定した料理と分量に基づき、カロリー(kcal)、タンパク質(g)、脂質(g)、炭水化物(g)を算出してください。
4. **詳細な説明**: ユーザーが納得できるよう、どのように分量を推測し、どの食材から栄養価を算出したかを簡潔に説明してください。

出力フォーマット (必ずJSON単体で出力):
{
  "food_name": "名称",
  "estimated_weight_g": 300,
  "calories": 450,
  "protein": 20.5,
  "fat": 15.0,
  "carbs": 55.0,
  "analysis_confidence": 0.85,
  "description": "説明文"
}
`;

export const analyzeMealImage = async (base64Image: string): Promise<MealAnalysisResult | null> => {
    if (!API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg",
            },
        };

        const result = await model.generateContent([SYSTEM_PROMPT, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Improved Robust JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("No JSON found in response:", text);
            return null;
        }

        const analysis: MealAnalysisResult = JSON.parse(jsonMatch[0]);
        return analysis;

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return null;
    }
};
const LABEL_SYSTEM_PROMPT = `
あなたはプロの管理栄養士です。
与えられた「栄養成分表示ラベル」の画像から数値を正確に抽出し、以下の仕様で回答してください。

1. 食品名または商品名を特定する（画像から読み取れる場合）。
2. 100gあたり、または1包装あたりの数値を正確に読み取る：エネルギー(kcal)、タンパク質(g)、脂質(g)、炭水化物(g)。
3. 日本語のラベル表記（熱量、蛋白質、炭水化物など）を正しくマッピングしてください。
4. 数値のみを抽出してください（単位は不要）。

出力フォーマット (JSONのみ):
{
  "food_name": "名称",
  "calories": 250,
  "protein": 5.2,
  "fat": 10.5,
  "carbs": 35.0,
  "analysis_confidence": 0.95,
  "description": "成分表示ラベルを解析しました。"
}
`;

export const analyzeLabelImage = async (base64Image: string): Promise<Partial<MealAnalysisResult> | null> => {
    if (!API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg",
            },
        };

        const result = await model.generateContent([LABEL_SYSTEM_PROMPT, imagePart]);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("No JSON found in label response:", text);
            return null;
        }

        const analysis = JSON.parse(jsonMatch[0]);
        return analysis;

    } catch (error) {
        console.error("Gemini Label Analysis Error:", error);
        return null;
    }
};
