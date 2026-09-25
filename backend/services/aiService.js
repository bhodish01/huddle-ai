import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateMeetingSummary = async (transcriptList) => {
  if (!transcriptList || transcriptList.length === 0) {
    return {
      summary: "No spoken content recorded during this session.",
      actionItems: [],
    };
  }

  const formattedTranscript = transcriptList
    .map((item) => `${item.speaker} [${item.timestamp || "N/A"}]: ${item.text}`)
    .join("\n");

  const prompt = `You are an expert executive meeting assistant. Analyze the following meeting transcript.
Provide:
1. A concise executive summary of what was discussed, decisions made, and key conclusions.
2. A list of concrete action items, identifying the specific task and the person responsible (or "Unassigned" if not explicitly mentioned).

Transcript:
${formattedTranscript}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Comprehensive executive summary of the meeting.",
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  assignee: { type: Type.STRING },
                },
                required: ["task", "assignee"],
              },
            },
          },
          required: ["summary", "actionItems"],
        },
      },
    });
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini Summarization Error:", error);
    throw new Error("Failed to generate AI summary.");
  }
};
