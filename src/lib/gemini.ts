import { GoogleGenerativeAI } from "@google/generative-ai";

// We will try these models in order until one works.
// User requested to ONLY use Gemini 2.5+ models (excluding 2.0/1.5).
const MODELS_TO_TRY = [
  "gemini-2.5-flash"
];

export async function convertImageToText(imgBase64: string, apiKey: string) {
  // Try models in sequence for text conversion
  const errors = [];
  for (const modelName of MODELS_TO_TRY) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const base64Data = imgBase64.split(",")[1];

      const prompt = `
        You are an expert exam digitizer. 
        Task: Transcribe the PRINTED text in this image.
        CRITICAL INSTRUCTION: COMPLETELY IGNORE AND REMOVE ANY HANDWRITTEN ANSWERS, MARKS, OR DOODLES.
        Return ONLY the printed question text. Maintain original formatting (newlines).
      `;

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: "image/png",
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.warn(`Model ${modelName} failed text conv:`, error);
      errors.push(`${modelName}: ${error.message}`);
      // Continue to next model
    }
  }
  throw new Error(`All models failed. Details:\n${errors.join('\n')}`);
}

// New function to detect question bounding boxes
export async function detectQuestionBlocks(imgBase64: string, apiKey: string) {
  const errors = [];
  
  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`Attempting auto-detect with model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      
      const model = genAI.getGenerativeModel({ model: modelName });
      const base64Data = imgBase64.split(",")[1];

      let prompt = `
        Analyze this exam paper. Identify the bounding boxes for each distinct question block.
        Return a STRICT JSON array of objects.
        Each object must have:
        - "ymin": number (0-100, top edge percentage)
        - "xmin": number (0-100, left edge percentage)
        - "ymax": number (0-100, bottom edge percentage)
        - "xmax": number (0-100, right edge percentage)
        
        Example:
        [
          {"ymin": 10, "xmin": 5, "ymax": 15, "xmax": 95},
          {"ymin": 20, "xmin": 5, "ymax": 30, "xmax": 95}
        ]
        Include ALL questions found.
        Return ONLY valid JSON. Do not wrap in markdown blocks.
      `;

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: "image/png",
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      let text = response.text();
      
      // Clean up markdown if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) return data; 
      } catch (e) {
        console.warn(`JSON parse failed for ${modelName}:`, text);
        // Don't count JSON parse error as a specialized model error, 
        // but maybe we should if the model returns garbage.
        // For now, let's just let it loop.
      }
      
    } catch (error: any) {
       console.warn(`Model ${modelName} auto-detect failed:`, error);
       errors.push(`${modelName}: ${error.message?.split('[')[0]}`); // Keep it brief
    }
  }

  // If we get here, all models failed
  console.error("All AI models failed.");
  // Return the full error list so the user can debug
  throw new Error(`所有模型皆失敗 (All models failed).\nErrors:\n${errors.join('\n')}`);
}
