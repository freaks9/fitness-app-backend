import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { prisma } from '../db';


dotenv.config();

// Ensure API Key exists
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is missing in .env file. AI Analysis will fail.");
} else {
    console.log(`[AI] Using API Key starting with: ${API_KEY.substring(0, 4)}... (Length: ${API_KEY.length})`);
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
与えられた画像から食事や飲み物の内容を精密に分析し、以下の仕様で回答してください。

1. **対象の特定**: 画像内の個々の食材、料理、または飲み物を正確に特定してください。
   - **パッケージ・ボトル**: 容器やラベルが写っている場合は、そこに記載されたテキスト情報を最優先で読み取り、商品名を特定してください（例：「ウイスキー 知多」「コカ・コーラ」など）。
   - **飲み物・アルコール**: 料理だけでなく、清涼飲料水やアルコール飲料も正確に判別してください。
   - **アンチ・ハルシネーション**: 根拠が乏しい場合に「牛丼」や「カレー」などの典型的な食事メニューを安易に推測しないでください。内容が不明確な場合は、画像から見える特徴を正直に記述し、最も可能性の高い推測を行ってください。

2. **分量の推定**: 皿のサイズ、食材の形状、または容器（ボトル、グラス）のサイズから、摂取分量(gまたはml)を推測してください。

3. **栄養計算**: 特定した内容と分量に基づき、カロリー(kcal)、タンパク質(g)、脂質(g)、炭水化物(g)を算出してください。
   - アルコール飲料の場合は、アルコール分によるエネルギーを必ず考慮に含めてください（純アルコール1gあたり約7kcal）。

4. **詳細な説明**: ユーザーが納得できるよう、具体的にどの部分（ラベル、形状、色など）から内容を判断したかを簡潔に説明してください。

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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const calculateBackoff = (attempt: number) => 2000 * Math.pow(2, attempt);

// Helper function to handle generation with fallback and retries
const generateWithFallback = async (systemPrompt: string, imagePart: any): Promise<string> => {
    // gemini-2.0-flash causes 429 (Rate Limit). Adding fallbacks.
    const models = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];
    let lastError: any = null;

    for (const modelName of models) {
        let attempt = 0;
        const maxRetriesPerModel = 2; // Try each model twice

        while (attempt < maxRetriesPerModel) {
            try {
                console.log(`[AI] Attempting with model: ${modelName} (Try ${attempt + 1})`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent([systemPrompt, imagePart]);
                const response = await result.response;
                return response.text();

            } catch (error: any) {
                console.warn(`[AI] Error with ${modelName}:`, error.message);
                lastError = error;

                if (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('503')) {
                    attempt++;
                    if (attempt < maxRetriesPerModel) {
                        const waitTime = calculateBackoff(attempt);
                        console.log(`[AI] Waiting ${waitTime}ms before retry...`);
                        await delay(waitTime);
                        continue;
                    }
                } else {
                    // If it's not a temporary error (e.g., 400 Bad Request), don't retry this model
                    break;
                }
            }
            attempt++;
        }
        console.log(`[AI] Switching to next fallback model...`);
    }
    throw lastError || new Error("All AI models failed.");
};

export const analyzeMealImage = async (base64Image: string): Promise<MealAnalysisResult | null> => {
    if (!API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    try {
        console.log(`[AI] Received Image Length: ${base64Image ? base64Image.length : 0}`);
        if (base64Image) console.log(`[AI] Base64 Start: ${base64Image.substring(0, 50)}...`);

        // Strip prefix if present (common issue)
        let cleanBase64 = base64Image;
        if (base64Image && base64Image.includes('base64,')) {
            console.log("[AI] Stripping data URI prefix...");
            cleanBase64 = base64Image.split('base64,')[1];
        }

        const imagePart = {
            inlineData: {
                data: cleanBase64,
                mimeType: "image/jpeg",
            },
        };

        // --- CACHE IMPLEMENTATION (Prisma) ---
        const imageHash = crypto.createHash('sha256').update(base64Image).digest('hex');
        console.log(`[AI] Checking Cache for Hash: ${imageHash}`);

        try {
            const cached = await prisma.aiAnalysisCache.findUnique({
                where: { imageHash: imageHash }
            });

            if (cached) {
                console.log(`[AI] Cache HIT for hash: ${imageHash.substring(0, 8)}...`);
                return JSON.parse(cached.resultJson);
            }
        } catch (dbError) {
            console.warn("[AI] Cache check failed (continuing to API):", dbError);
        }
        // ----------------------------


        const text = await generateWithFallback(SYSTEM_PROMPT, imagePart);

        console.log("--- Raw Gemini Response ---");
        console.log(text);
        console.log("---------------------------");

        // Best Practice 3: Clean up Markdown before parsing
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("No JSON found in response:", text);
            throw new Error(`AI Response did not contain valid JSON.`);
        }

        const resultJSON = JSON.parse(jsonMatch[0]);

        // --- SAVE TO CACHE (Prisma) ---
        try {
            await prisma.aiAnalysisCache.create({
                data: {
                    imageHash: imageHash,
                    resultJson: JSON.stringify(resultJSON)
                }
            });
            console.log(`[AI] Cache SAVED for hash: ${imageHash.substring(0, 8)}...`);
        } catch (saveError) {
            // Ignore duplicate key errors silently
            console.error("[AI] Failed to save to cache:", saveError);
        }
        // ---------------------


        return resultJSON;

    } catch (error: any) {
        console.error("Gemini Analysis Final Error:", error.message);
        throw new Error(`Gemini API Error: ${error.message || error}`);
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
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg",
            },
        };

        const text = await generateWithFallback(LABEL_SYSTEM_PROMPT, imagePart);

        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("No JSON found in label response:", text);
            throw new Error(`AI Label Response did not contain valid JSON.`);
        }

        return JSON.parse(jsonMatch[0]);

    } catch (error: any) {
        console.error("Gemini Label Analysis Final Error:", error.message);
        throw new Error(`Gemini Label API Error: ${error.message || error}`);
    }
};
