
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testFlashLite() {
    const modelName = "gemini-2.0-flash-lite";
    console.log(`Testing model: ${modelName}`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log(`✅ SUCCESS: ${modelName} works! Response: ${response.text()}`);
    } catch (error) {
        if (error.response) {
            console.log(`❌ FAILED: ${modelName} - Status: ${error.response.status}`);
            console.log("Details:", JSON.stringify(error.response, null, 2));
        } else {
            console.log(`❌ FAILED: ${modelName} - ${error.message}`);
        }
    }
}

testFlashLite();
