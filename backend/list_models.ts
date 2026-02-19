
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
// @ts-ignore
const genAI = new GoogleGenerativeAI(API_KEY || '');

async function listModels() {
    console.log("Listing models...");
    try {
        // Access the model manager directly if possible, or use a workaround.
        // The GoogleGenerativeAI class doesn't have listModels directly on instances typically? 
        // Actually it might be on the class or via a different client.
        // Let's try to infer from documentation knowledge: genAI.getGenerativeModel is the main entry.
        // There isn't a simple listModels in the high-level SDK sometimes. 
        // But for v1beta, it should be possible.

        // Let's try to just test a bunch of likely names.
        const candidates = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-002",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro",
            "gemini-1.5-pro-001",
            "gemini-1.5-pro-002",
            "gemini-1.5-pro-latest",
            "models/gemini-1.5-flash",
            "models/gemini-1.5-pro"
        ];

        for (const modelName of candidates) {
            process.stdout.write(`Testing ${modelName}... `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                await model.generateContent("Test");
                console.log("✅ OK");
            } catch (e: any) {
                if (e.message.includes("404")) console.log("❌ 404");
                else if (e.message.includes("429")) console.log("⚠️ 429 (Exists but busy)");
                else console.log(`❌ Error: ${e.message.substring(0, 50)}...`);
            }
        }

    } catch (error: any) {
        console.error("Error listing:", error);
    }
}

listModels();
