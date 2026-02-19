
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');
const IMAGE_PATH = '/Users/shinichiro/.gemini/antigravity/brain/8f71df24-f0d1-4218-8752-59ae0c3a3ad8/uploaded_media_1771486271952.png';

async function testVision(m: string) {
    console.log(`Checking Vision for [${m}]...`);
    try {
        const model = genAI.getGenerativeModel({ model: m });
        const bitmap = fs.readFileSync(IMAGE_PATH);
        const res = await model.generateContent([
            "What is this?",
            { inlineData: { data: Buffer.from(bitmap).toString('base64'), mimeType: "image/jpeg" } }
        ]);
        console.log(`  ✅ ${m}: SUCCESS (${res.response.text().substring(0, 30)}...)`);
        return true;
    } catch (e: any) {
        if (e.message.includes("404")) console.log(`  ❌ ${m}: 404 NOT FOUND`);
        else if (e.message.includes("429")) console.log(`  ⚠️ ${m}: 429 QUOTA EXCEEDED`);
        else console.log(`  ❌ ${m}: ERROR: ${e.message.substring(0, 100)}`);
        return false;
    }
}

async function main() {
    const list = [
        "gemini-flash-lite-latest",
        "gemini-2.5-flash-image",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-pro-latest"
    ];
    for (const m of list) {
        await testVision(m);
        console.log("---");
    }
}

main();
