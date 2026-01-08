import { GoogleGenerativeAI } from "@google/generative-ai";

// We will try these models in order until one works.
// We prioritize 1.5 Flash as it is the most robust standard model.
// We fallback to Pro Vision for older keys.
const MODELS_TO_TRY = ["gemini-1.5-flash", "gemini-pro-vision", "gemini-1.5-pro"];

export async function convertImageToText(imgBase64: string, apiKey: string) {
  // Try models in sequence for text conversion
  let lastError;
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
    } catch (error) {
      console.warn(`Model ${modelName} failed text conv:`, error);
      lastError = error;
      // Continue to next model
    }
  }
  throw lastError || new Error("All models failed to convert text.");
}

// New function to detect question bounding boxes
export async function detectQuestionBlocks(imgBase64: string, apiKey: string) {
  let lastError;
  
  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`Attempting auto-detect with model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Only modern models support JSON mode natively
      const isModern = modelName.includes("1.5") || modelName.includes("flash") || modelName.includes("pro-vision") === false;
      const modelConfig: any = { model: modelName };
      
      // Note: gemini-pro-vision fails if you pass responseMimeType
      if (isModern) {
         modelConfig.generationConfig = { responseMimeType: "application/json" };
      }

      const model = genAI.getGenerativeModel(modelConfig);
      const base64Data = imgBase64.split(",")[1];

      let prompt = `
        Analyze this exam paper. Identify the bounding boxes for each distinct question block.
        Return a JSON array of objects. Each object must have:
        - "ymin": number (0-100, top edge percentage)
        - "xmin": number (0-100, left edge percentage)
        - "ymax": number (0-100, bottom edge percentage)
        - "xmax": number (0-100, right edge percentage)
        
        Example:
        [
          {"ymin": 10, "xmin": 5, "ymax": 15, "xmax": 95},
          ...
        ]
        Include ALL questions found.
      `;

      // For older models, we need to be stricter about JSON formatting in the prompt since we can't enforce it via config
      if (!isModern) {
        prompt += "Return ONLY valid JSON. Do not wrap in markdown blocks.";
      }

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: "image/png",
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      let text = response.text();
      
      // Clean up markdown if present (handling older model behavior)
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) return data; 
      } catch (e) {
        console.warn(`JSON parse failed for ${modelName}:`, text);
      }
      
    } catch (error) {
       console.warn(`Model ${modelName} auto-detect failed:`, error);
       lastError = error;
    }
  }

  // If we get here, all models failed
  console.error("All AI models failed.");
  throw lastError || new Error("All AI models failed. Please check your API key.");
}
