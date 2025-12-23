
import { GoogleGenAI, Type } from "@google/genai";
import { AIThemeResponse } from "../types";

export const getThemedSettings = async (prompt: string): Promise<AIThemeResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `The user wants a snowflake bookmark theme: "${prompt}". Suggest parameters for snowflake generation.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          themeName: { type: Type.STRING },
          description: { type: Type.STRING },
          suggestedSettings: {
            type: Type.OBJECT,
            properties: {
              numFlakes: { type: Type.INTEGER },
              minSize: { type: Type.NUMBER },
              maxSize: { type: Type.NUMBER },
              complexity: { type: Type.INTEGER },
              seed: { type: Type.INTEGER }
            }
          }
        },
        required: ["themeName", "description", "suggestedSettings"]
      }
    }
  });

  return JSON.parse(response.text);
};
