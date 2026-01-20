import { GoogleGenAI, Type } from "@google/genai";
import { ReminderPriority } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CATEGORY_LIST = "General, Work, Personal, Health, Urgent, Ideas";

export async function enhanceReminder(userInput: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza este recordatorio solo para clasificarlo, NO cambies su texto: "${userInput}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: `One word category from this list: ${CATEGORY_LIST}` },
            priority: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
            color: { type: Type.STRING, description: "A Tailwind color class like 'bg-blue-400' or 'bg-rose-400'" }
          },
          required: ["category", "priority", "color"]
        }
      }
    });

    const data = JSON.parse(response.text);
    return data;
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

export async function getSmartSuggestions() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest exactly 3 clever, fun, or useful daily reminders for a user's phone home screen. CRITICAL: Each of the 3 suggestions MUST belong to a COMPLETELY DIFFERENT category (choose from: ${CATEGORY_LIST}). Do not repeat categories. Keep text very short (max 15 characters).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The reminder text" },
              category: { 
                type: Type.STRING, 
                description: `The category of the reminder. Must be one of: ${CATEGORY_LIST}. Ensure all items in the array have a different category.` 
              }
            },
            required: ["text", "category"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Suggestions Error:", error);
    return [];
  }
}