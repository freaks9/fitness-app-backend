
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');
const IMAGE_PATH = '/Users/shinichiro/.gemini/antigravity/brain/8f71df24-f0d1-4218-8752-59ae0c3a3ad8/uploaded_media_1771486271952.png';

async function check(m: string) {
    console.log(`Checking ${m}...`);
    try {
        const model = genAI.getGenerativeModel({ model: m });
        // Text
        await model.generateContent("Hi");
        console.log(`  ${m} TEXT: ✅ OK`);

        // Image
        const bitmap = fs.readFileSync(IMAGE_PATH);
        await model.generateContent(["Hi", { inlineData: { data: Buffer.from(bitmap).toString('base64'), mimeType: "image/jpeg" } }]);
        console.log(`  ${m} IMAGE: ✅ OK`);
    } catch (e: any) {
        console.log(`  ${m}: ❌ ${e.message.substring(0, 100)}`);
    }
}

async function main() {
    await check("gemini-2.0-flash");
    await check("gemini-2.5-flash-image");
    await check("gemini-flash-latest");
}
main();
