
import dotenv from 'dotenv';
import fs from 'fs';
import { analyzeMealImage } from './src/services/aiAnalysis';

dotenv.config();

const IMAGE_PATH = '/Users/shinichiro/.gemini/antigravity/brain/8f71df24-f0d1-4218-8752-59ae0c3a3ad8/uploaded_media_1771486271952.png';

async function main() {
    console.log("--- Starting Verification ---");
    if (!fs.existsSync(IMAGE_PATH)) {
        console.error("❌ Test image not found:", IMAGE_PATH);
        process.exit(1);
    }

    console.log("Reading image...");
    const bitmap = fs.readFileSync(IMAGE_PATH);
    const base64Image = Buffer.from(bitmap).toString('base64');
    console.log(`Image read. Base64 length: ${base64Image.length}`);

    try {
        console.log("Calling analyzeMealImage...");
        // Simulate frontend sending data URI prefix sometimes, sometimes not.
        // Let's send raw base64 as the frontend likely does now after our fixes or before.
        // Actually, let's test with the prefix to ensure stripping works too, 
        // OR just raw base64. Let's send raw base64 first.
        const result = await analyzeMealImage(base64Image);
        console.log("✅ Analysis Success!");
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.error("❌ Analysis Failed:", error.message);
        console.error("Full Error:", error);
    }
}

main();
