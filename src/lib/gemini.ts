import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// We will try these models in order until one works.
// User requested to ONLY use Gemini 2.5+ models (excluding 2.0/1.5).
const MODELS_TO_TRY = [
  "gemini-2.5-flash"
];

// Safety settings to allow exam content (sometimes flagged incorrectly as harmful)
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

export async function convertImageToText(imgBase64: string, apiKey: string) {
  // Try models in sequence for text conversion
  const errors = [];
  for (const modelName of MODELS_TO_TRY) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings: SAFETY_SETTINGS
      });
      const base64Data = imgBase64.split(",")[1];

      const prompt = `
        You are an expert exam digitizer. 
        Task: Transcribe the PRINTED text in this image.
        
        Rules:
        1. **Detect Question Text**: Identify the main question content.
        2. **IGNORE Handwriting**: Do NOT transcribe any handwritten notes, answers, or circles. Treat them as noise.
        3. **Math Mode**: Use standard text or simple LaTeX for math symbols.
        4. **Formatting**: Keep lines broken as they appear in the visual block.
        
        Output only the detected printed text.
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
      
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings: SAFETY_SETTINGS
      });
      const base64Data = imgBase64.split(",")[1];

      let prompt = `
        Look at this exam paper.
        Task: Identify the bounding box for EACH individual numbered question.
        
        Instructions:
        1. Find every question number (e.g., 1, 2, 3, 4...).
        2. Draw a tight bounding box around the question text and its options/graphics.
        3. **DO NOT** combine multiple questions into one big box. Split them up!
        4. Ignore the page header (title, name field).
        
        Return a strict JSON array:
        [
          {"ymin": 0, "xmin": 0, "ymax": 100, "xmax": 100},
          ...
        ]
        (Values are 0-100 percentages)
        
        Return ONLY valid JSON.
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
