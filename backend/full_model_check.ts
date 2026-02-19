
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');
const IMAGE_PATH = '/Users/shinichiro/.gemini/antigravity/brain/8f71df24-f0d1-4218-8752-59ae0c3a3ad8/uploaded_media_1771486271952.png';

async function check(modelName: string) {
    console.log(`Checking [${modelName}]...`);

    // Text Check
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const res = await model.generateContent("Hi");
        console.log(`  TEXT: ✅ OK (${res.response.text().substring(0, 10)}...)`);
    } catch (e: any) {
        console.log(`  TEXT: ❌ ${e.message.substring(0, 60)}`);
    }

    // Image Check
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const bitmap = fs.readFileSync(IMAGE_PATH);
        const base64 = Buffer.from(bitmap).toString('base64');
        const res = await model.generateContent(["Describe", { inlineData: { data: base64, mimeType: "image/jpeg" } }]);
        console.log(`  IMAGE: ✅ OK`);
    } catch (e: any) {
        console.log(`  IMAGE: ❌ ${e.message.substring(0, 60)}`);
    }
}

async function main() {
    const list = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite-preview-02-05",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
        "gemini-1.0-pro"
    ];
    for (const m of list) {
        await check(m);
        console.log("---");
    }
}

main();
