import { GoogleGenerativeAI } from "@google/generative-ai";

// Use gemini-pro-vision as it is the stable model for many older/standard keys
const MODEL_NAME = "gemini-pro-vision";

export async function convertImageToText(imgBase64: string, apiKey: string) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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
    console.error("Error converting image to text:", error);
    throw error;
  }
}

// New function to detect question bounding boxes
export async function detectQuestionBlocks(imgBase64: string, apiKey: string) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // gemini-pro-vision usually does not support responseMimeType: "application/json" well
    // So we ask for text and parse it manually.
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const base64Data = imgBase64.split(",")[1];

    const prompt = `
      Analyze this exam paper. Identify the bounding boxes for each distinct question block.
      Return a STRICT JSON array of objects. Do not wrap in markdown code blocks.
      Each object must have:
      - "ymin": number (0-100, top edge percentage)
      - "xmin": number (0-100, left edge percentage)
      - "ymax": number (0-100, bottom edge percentage)
      - "xmax": number (0-100, right edge percentage)
      
      Example:
      [{"ymin": 10, "xmin": 5, "ymax": 15, "xmax": 95}, {"ymin": 20, "xmin": 5, "ymax": 30, "xmax": 95}]
      
      Include ALL questions found.
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
    
    // Clean up potential markdown formatting
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

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
