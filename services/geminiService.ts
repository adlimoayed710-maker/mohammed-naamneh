import { GoogleGenAI } from "@google/genai";
import { SmileStyle, ToothShade } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using "nano banana" equivalent as per instructions: gemini-2.5-flash-image
const MODEL_NAME = "gemini-2.5-flash-image";

export const generateSmile = async (
  imageBase64: string,
  style: SmileStyle,
  shade: ToothShade
): Promise<string> => {
  try {
    // Remove header from base64 if present
    const cleanBase64 = imageBase64.split(",")[1] || imageBase64;

    const prompt = `
      You are an advanced cosmetic dental AI assistant.
      Task: Edit the photo to simulate a dental makeover.
      
      Requirements:
      1. Change the person's smile to verify the following style: "${style}".
      2. Adjust the tooth shade to match exactly: "${shade}".
      3. CRITICAL: Maintain absolute photorealism. The texture of the teeth, gums, and lips must look medically accurate and natural.
      4. Do not alter the person's face structure, skin tone, or background. Only modify the mouth/teeth area seamlessly.
      5. Lighting and shadows on the teeth must match the original photo's environment.
      
      Output: Return only the modified image.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
        ],
      },
    });

    // Extract image from response parts safely
    const candidate = response.candidates?.[0];

    if (!candidate) {
        throw new Error("لم يتم استلام أي نتائج من النموذج.");
    }

    // Check if content exists before accessing parts
    if (!candidate.content) {
        console.warn("Model finished without content. Reason:", candidate.finishReason);
        throw new Error(`تعذر إنشاء الصورة (السبب: ${candidate.finishReason || 'غير معروف'}). يرجى التأكد من وضوح الصورة وتجربة زاوية أخرى.`);
    }

    if (candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("لم يتم العثور على صورة في استجابة النظام.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "فشل في معالجة الصورة. الرجاء المحاولة مرة أخرى.");
  }
};