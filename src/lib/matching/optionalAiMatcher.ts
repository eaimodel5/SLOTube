import { GoogleGenAI } from "@google/genai";
import { NormalizedSloGoal } from "../slo/sloTypes";
import { VideoCandidate, SloAlignment } from "../../types";

export async function runAiAssessment(
  video: VideoCandidate,
  goal: NormalizedSloGoal
): Promise<SloAlignment | null> {
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
      Uitwerkingen: ${goal.elaborations?.join("; ") || "Geen specifieke uitwerkingen beschikbaar."}
      Voorbeelden: ${goal.examples?.join("; ") || "Geen specifieke voorbeelden beschikbaar."}
      
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
        "confidence": "laag" | "midden" | "hoog",
        "coveredElaborations": [
          { "text": "korte beschrijving uitwerking", "evidence": "waarom dit gedekt is", "confidence": number }
        ],
        "coveredIllustrations": [
          { "text": "korte beschrijving voorbeeld", "evidence": "waarom dit gedekt is", "confidence": number }
        ],
        "missingParts": ["wat ontbreekt er voor volledige dekking"],
        "doelgroepFit": "zwak" | "voldoende" | "sterk",
        "reasonShort": "korte didactische onderbouwing (max 2 zinnen)"
      }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const text = result.text;
    if (!text) return null;
    
    const parsed = JSON.parse(text);
    return {
      goalId: goal.id,
      ...parsed
    } as SloAlignment;
  } catch (e) {
    console.error("AI Assessment failed:", e);
    return null;
  }
}
