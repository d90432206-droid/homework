import { GoogleGenerativeAI } from "@google/generative-ai";

export async function convertImageToText(imgBase64: string, apiKey: string) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    // Remove data:image/png;base64, prefix
    const base64Data = imgBase64.split(",")[1];

    const prompt = "Transcribe the printed text in this exam question image accurately. Ignore/remove any handwritten answers or markings. Return ONLY the question text. If there are multiple lines, preserve them.";

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/png",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error converting image to text:", error);
    throw error; // Re-throw to handle in UI
  }
}
