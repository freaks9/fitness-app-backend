
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testFlashLatest() {
    const modelName = "gemini-flash-latest";
    console.log(`Testing model: ${modelName}`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log(`✅ SUCCESS: ${modelName} works! Response: ${response.text()}`);
    } catch (error) {
        console.log(`❌ FAILED: ${modelName} - ${error.message}`);
        if (error.response) {
            console.log("Details:", JSON.stringify(error.response, null, 2));
        }
    }
}

testFlashLatest();
