
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');
const IMAGE_PATH = '/Users/shinichiro/.gemini/antigravity/brain/8f71df24-f0d1-4218-8752-59ae0c3a3ad8/uploaded_media_1771486271952.png';

// @ts-ignore
async function testImage(modelName) {
    console.log(`Testing Image with ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const bitmap = fs.readFileSync(IMAGE_PATH);
        const base64Image = Buffer.from(bitmap).toString('base64');

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg",
            },
        };

        const result = await model.generateContent(["Describe this image", imagePart]);
        const response = await result.response;
        console.log(`✅ ${modelName} Image Success:`, response.text().substring(0, 50));
    } catch (error: any) {
        console.error(`❌ ${modelName} Image Failed:`, error.message);
    }
}

async function main() {
    await testImage("gemini-1.5-flash");
    await testImage("gemini-1.5-flash-001");
    await testImage("gemini-1.5-flash-latest");
    await testImage("gemini-pro-vision");
}

main();
