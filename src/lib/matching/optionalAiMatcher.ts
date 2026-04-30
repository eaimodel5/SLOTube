import { GoogleGenAI } from "@google/genai";
import { NormalizedSloGoal } from "../slo/sloTypes";
import { VideoCandidate } from "../../types";

export interface AiAssessmentResult {
  score: number;
  advice: "approve" | "reject" | "needs_review";
  targetGroupFit: "poor" | "acceptable" | "good";
  sloFit: "poor" | "acceptable" | "good";
  educationalUse: "poor" | "acceptable" | "good";
  sourceReliability: "low" | "medium" | "high";
  reason: string;
  warnings: string[];
}

export async function runAiAssessment(
  video: VideoCandidate,
  goal: NormalizedSloGoal
): Promise<AiAssessmentResult | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Je bent een Nederlandse onderwijsexpert en curator voor leermiddelen. 
      Beoordeel of de onderstaande video of bron geschikt is voor het gegeven SLO kerndoel.
      
      RICHTLIJNEN:
      - Wees kritisch op educatieve waarde.
      - Controleer of de inhoud aansluit bij de actor (doelgroep: ${goal.actor}).
      - Kijk naar de "uitwerkingen" en "voorbeelden" uit de SLO data voor diepgang.
      
      KERNDOEL CONTEXT:
      ID: ${goal.id}
      Vak: ${goal.subject}
      Domein: ${goal.domain}
      Kerndoelzin: ${goal.sentence}
      Omschrijving: ${goal.description}
      Actor/Doelgroep: ${goal.actor}
      Uitwerkingen: ${goal.elaborations.join("; ")}
      Voorbeelden: ${goal.examples.join("; ")}
      
      BRON CONTEXT:
      Titel: ${video.title}
      Bron: ${video.sourceName} (${video.sourceId})
      Kanaal/Aanbieder: ${video.channelTitle}
      Beschrijving: ${video.description}
      URL: ${video.sourceUrl}
      Lokale matchscore: ${video.matchScore}
      Lokale reden: ${video.matchReason}
      
      GEEF ANTWOORD IN DIT JSON FORMAT:
      {
        "score": number (0-100),
        "advice": "approve" | "reject" | "needs_review",
        "targetGroupFit": "poor" | "acceptable" | "good",
        "sloFit": "poor" | "acceptable" | "good",
        "educationalUse": "poor" | "acceptable" | "good",
        "sourceReliability": "low" | "medium" | "high",
        "reason": "korte didactische onderbouwing",
        "warnings": ["lijst met waarschuwingen of twijfels"]
      }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const text = result.text;
    if (!text) return null;
    return JSON.parse(text) as AiAssessmentResult;
  } catch (e) {
    console.error("AI Assessment failed:", e);
    return null;
  }
}
