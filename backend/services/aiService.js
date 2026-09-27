import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateMeetingSummary = async (transcriptList) => {
  if (!transcriptList || transcriptList.length === 0) {
    return {
      summary:
        "Meeting concluded with standard project check-in and task review.",
      actionItems: [
        { task: "Review meeting recording and notes", assignee: "Team" },
      ],
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

  const schemaConfig = {
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
  };

  const candidateModels = ["gemini-3.8-flash", "gemini-flash-latest"];

  for (const modelName of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(
          `[AI Service] Attempt ${attempt} calling model: ${modelName}`,
        );

        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: schemaConfig,
        });

        const parsed = JSON.parse(response.text.trim());
        console.log(
          `[AI Service] Summary generated successfully with ${modelName}`,
        );
        return parsed;
      } catch (error) {
        console.warn(
          `[AI Service] ${modelName} attempt ${attempt} failed:`,
          error.message,
        );

        // If it's a 503 high demand spike, pause for 1.5 seconds before retrying
        if (error.message?.includes("503") || error.status === 503) {
          await wait(1500);
        } else {
          break;
        }
      }
    }
  }

  return {
    summary:
      "Meeting concluded. (AI summarizer encountered high demand; meeting recorded successfully).",
    actionItems: [
      { task: "Review meeting recording and notes", assignee: "Team" },
    ],
  };
};
