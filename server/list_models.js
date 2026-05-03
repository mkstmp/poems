import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  // Wait, GoogleGenerativeAI doesn't have listModels in all versions, 
  // but we can just use raw fetch
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await response.json();
  const geminiModels = data.models.filter(m => m.name.includes('gemini'));
  console.log(geminiModels.map(m => m.name));
}
run();
