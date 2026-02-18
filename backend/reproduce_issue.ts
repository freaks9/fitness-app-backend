import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

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

async function run() {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imagePath = '/Users/shinichiro/.gemini/antigravity/brain/8f71df24-f0d1-4218-8752-59ae0c3a3ad8/uploaded_media_1771394069634.png';
    const imageData = fs.readFileSync(imagePath).toString('base64');

    const imagePart = {
        inlineData: {
            data: imageData,
            mimeType: "image/png",
        },
    };

    console.log("Calling Gemini with the whiskey image...");
    const result = await model.generateContent([SYSTEM_PROMPT, imagePart]);
    const response = await result.response;
    console.log("Response text:", response.text());
}

run().catch(console.error);
