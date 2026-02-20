
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
    console.error("No API key found");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: apiKey });

async function listModels() {
    try {
        console.log("Listing models...");
        // valid for @google/genai SDK verify the method
        // it seems SDK might not have listModels on the client instance directly sometimes or different
        // Let's try to infer or just try a known working model like 'gemini-pro'
        // But better to try to list if possible.
        // Actually, the error message said: "Call ListModels to see the list..."
        const response = await ai.models.list();
        console.log("Available Models:");
        response.models.forEach(m => console.log(`- ${m.name}`));
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

listModels();
