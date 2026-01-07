
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ArtStyle, WebtoonPlan } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

const getAIClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

export const verifyApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const ai = getAIClient(apiKey);
    // Minimal request to check validity
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: 'hi' }] },
      config: { maxOutputTokens: 1 }
    });
    return true;
  } catch (err) {
    console.error("API Key Verification Failed:", err);
    return false;
  }
};

export const createWebtoonPlan = async (subject: string, style: ArtStyle, apiKey: string): Promise<WebtoonPlan> => {
  const ai = getAIClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: `주제: "${subject}", 화풍: "${style}"` }] },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          artStyle: { type: Type.STRING },
          recommendedCharacter: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              appearance: { type: Type.STRING },
              features: { type: Type.STRING },
            },
            required: ["name", "appearance", "features"]
          },
          storySummary: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          dialogues: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          infoTextBlock: { type: Type.STRING },
          referenceSources: {
             type: Type.ARRAY,
             items: { type: Type.STRING }
          },
          outroDetails: {
            type: Type.OBJECT,
            properties: {
              secondCharacter: { type: Type.STRING },
              action: { type: Type.STRING },
              dialogue: { type: Type.STRING },
            },
            required: ["secondCharacter", "action", "dialogue"]
          },
          mainColor: { type: Type.STRING },
          englishPrompt: { type: Type.STRING },
        },
        required: ["subject", "artStyle", "recommendedCharacter", "storySummary", "dialogues", "infoTextBlock", "referenceSources", "outroDetails", "mainColor", "englishPrompt"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as WebtoonPlan;
};

export const rebuildPrompt = async (plan: WebtoonPlan, apiKey: string): Promise<string> => {
  const ai = getAIClient(apiKey);
  const promptRequest = `
    Generate a Nanobanana image generation prompt. 
    STRICT RULE: Keep all dialogue, info text, and outro dialogue in the ORIGINAL LANGUAGE (e.g., Korean/Japanese). DO NOT TRANSLATE.

    1. Character: ${plan.recommendedCharacter.name} (${plan.recommendedCharacter.appearance})
    2. 4-Panel Story:
    ${plan.storySummary.map((s, i) => `Panel ${i+1}: Action: ${s} | Text in speech bubble: "${plan.dialogues[i]}"`).join('\n')}
    
    3. Info Block (Below 4 panels):
    Title: "TIPS & INFO"
    Content: "${plan.infoTextBlock.replace(/\n/g, ' ')}" (Include this exact text in a clean infographic box)
    
    4. Outro Panel (Final Panel):
    Second Character: ${plan.outroDetails.secondCharacter}
    Action: ${plan.outroDetails.action}
    Dialogue: "${plan.outroDetails.dialogue}"
    
    Style: ${plan.artStyle}, Main Color: ${plan.mainColor}
    
    Final Instruction:
    - Create a single, cohesive English prompt.
    - Mention "vertical comic strip" and "4-panel with an extra info block and outro at the bottom".
    - Quality: masterpiece, best quality, 8k, ultra detailed.
    - End with --ar 9:16.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: promptRequest }] },
    config: {
      systemInstruction: "You are a prompt engineer. Return ONLY the final prompt. NEVER translate the text inside quotes; keep it in the user's original language.",
    }
  });

  return response.text?.trim() || plan.englishPrompt;
};

export const generateWebtoonPreviewImage = async (prompt: string, apiKey: string): Promise<string | null> => {
  const ai = getAIClient(apiKey);
  try {
    // Restoring PRO model settings for high quality 2K generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "9:16",
          imageSize: "2K" // Explicitly requesting 2K High Quality
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error: any) {
    console.error("Image generation failed:", error);
    let errorMessage = "Image generation failed.";
    if (error.message) {
        if (error.message.includes("403")) errorMessage = "Access denied. Gemini 3 Pro requires a paid/allowlisted API key.";
        else if (error.message.includes("404")) errorMessage = "Model not found or not available in your region.";
        else if (error.message.includes("429")) errorMessage = "Quota exceeded. Please try again later.";
        else if (error.message.includes("SAFETY")) errorMessage = "Image blocked by safety filters.";
        else errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};
