import { GoogleGenerativeAI } from "@google/generative-ai";

// Use Gemini 1.5 Flash for faster and better multimodal performance
const MODEL_NAME = "gemini-1.5-flash";

export async function convertImageToText(imgBase64: string, apiKey: string) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const base64Data = imgBase64.split(",")[1];

    // Improved prompt for handwriting removal
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
    console.error("Error converting image to text:", error);
    throw error;
  }
}

// New function to detect question bounding boxes
export async function detectQuestionBlocks(imgBase64: string, apiKey: string) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use layout analysis capabilities
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: { responseMimeType: "application/json" }
    });

    const base64Data = imgBase64.split(",")[1];

    const prompt = `
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
      Include ALL questions found. Do not miss any.
    `;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/png",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON from Gemini:", text);
      return [];
    }
  } catch (error) {
    console.error("Error detecting blocks:", error);
    throw error;
  }
}
