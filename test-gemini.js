
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// Read .env.local manually since we are running with node directly
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
    console.error("Could not find GEMINI_API_KEY in .env.local");
    process.exit(1);
}

console.log("Found API Key:", apiKey.substring(0, 10) + "...");

const ai = new GoogleGenAI({ apiKey: apiKey });

const candidateModels = [
    'models/gemini-2.5-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp',
    'models/gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'models/gemini-1.5-flash'
];

async function testHelp() {
    for (const modelName of candidateModels) {
        try {
            console.log(`Testing model: ${modelName}...`);
            const response = await ai.models.generateContent({
                model: modelName,
                contents: {
                    parts: [{ text: "Hello, answer with 'Pong!'" }]
                }
            });

            // Fix: response.text is a property in new SDK or helper, let's check
            // Actually in @google/genai, response is `GenerateContentResponse`.
            // It might have `text()` helper or `text` property depending on version.
            // But geminiService.ts uses `.text` property. 
            // Let's safe check.
            const text = typeof response.text === 'function' ? response.text() : response.text;
            console.log("Response:", text);
            console.log(`SUCCESS! Valid text model is: ${modelName}`);

            // Now test Image Generation
            console.log("Testing Image Generation with imagen-3.0-generate-001...");
            try {
                const imgResponse = await ai.models.generateContent({
                    model: 'imagen-3.0-generate-001',
                    contents: {
                        parts: [{ text: "A cute robot teacher, 3d render" }]
                    }
                });
                console.log("Image Response received.");
                // Check if it has data
                if (imgResponse.candidates && imgResponse.candidates[0]?.content?.parts?.[0]?.inlineData) {
                    console.log("Image Data found!");
                } else {
                    console.log("No image inlineData found, maybe different structure?");
                    console.log(JSON.stringify(imgResponse, null, 2));
                }
            } catch (imgError) {
                console.error("Image Gen Failed (Expected if tier is low):", imgError.message);
                console.log("Falling back to Pollinations would save us here in production.");
            }

            return; // Exit on success
        } catch (error) {
            console.error(`Failed with ${modelName}:`);
            console.error(error.message || error);
        }
    }
    console.error("All models failed.");
}


testHelp();
