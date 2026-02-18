import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("GEMINI_API_KEY is missing");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

console.log(`Loaded API KEY: ${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 5)} (Length: ${API_KEY.length})`);

async function listModels() {
    try {
        // For google-generative-ai SDK, we might not have direct access to listModels via the main class in older versions,
        // but let's try the model manager if available or just check ability to access.
        // Actually, the SDK doesn't expose listModels directly in the high level response often.
        // But we can try to use the `getGenerativeModel` with a known one or just print what we can.

        // Wait, the error message itself suggested "Call ListModels".
        // In the node SDK, it might be available via a different manager.
        // Let's try to just instantiate a model and catch error, or strict list if possible.
        // Actually, looking at docs, there isn't a simple listModels in the high-level `GoogleGenerativeAI` class.
        // It is usually in the lower level generic client.

        // Let's try to query a standard one `gemini-pro` first to see if it works as a connectivity test.
        console.log("Checking gemini-1.5-flash...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent("Hello");
            console.log("gemini-1.5-flash is WORKING");
        } catch (e: any) {
            console.log("gemini-1.5-flash failed:", e.message.split('\n')[0]);
        }

        console.log("Checking gemini-1.5-flash-001...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
            const result = await model.generateContent("Hello");
            console.log("gemini-1.5-flash-001 is WORKING");
        } catch (e: any) {
            console.log("gemini-1.5-flash-001 failed:", e.message.split('\n')[0]);
        }

        console.log("Checking gemini-flash-latest...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const result = await model.generateContent("Hello");
            console.log("gemini-flash-latest is WORKING");
        } catch (e: any) {
            console.log("gemini-flash-latest failed:", e.message.split('\n')[0]);
        }

        console.log("Checking gemini-2.0-flash...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent("Hello");
            console.log("gemini-2.0-flash is WORKING");
        } catch (e: any) {
            console.log("gemini-2.0-flash failed:", e.message.split('\n')[0]);
        }

        console.log("Checking gemini-pro...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("Hello");
            console.log("gemini-pro is WORKING");
        } catch (e: any) {
            console.log("gemini-pro failed:", e.message.split('\n')[0]);
        }

        console.log("Checking gemini-2.0-flash...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent("Hello");
            console.log("gemini-2.0-flash is WORKING");
        } catch (e: any) {
            console.log("gemini-2.0-flash failed:", e.message.split('\n')[0]);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
