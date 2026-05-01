import { GoogleGenAI } from "@google/genai";
import { NormalizedSloGoal } from "../slo/sloTypes";

export async function evaluateYouTubePotential(goal: NormalizedSloGoal): Promise<boolean> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!geminiKey) return true; // Fallback to true if no key

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    
    // We try to assess if YouTube is a good source for this specific goal
    const prompt = `Je bent een onderwijsexpert. Gegeven het volgende leerdoel:
    
Leerdoel: ${goal.sentence}
Doelgroep: ${goal.actor}
Omschrijving: ${goal.description || ''}

Beoordeel of het waarschijnlijk is dat er op YouTube voldoende kwalitatieve, Nederlandstalige, educatieve video's (bijv. uitlegvideo's, Schooltv, Clipphanger) te vinden zijn voor dit leerdoel.
Sommige onderwerpen (taal, wiskunde, geschiedenis, biologie) lenen zich goed voor YouTube, andere (zeer specifieke of lokaal/praktijkafhankelijke doelen) veel minder.
Antwoord ALleen met de tekst 'JA' of 'NEE'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.1,
      }
    });

    const isYes = response.text?.trim().toUpperCase().includes("JA");
    console.log(`[YouTube Presearch] Evaluated goal "${goal.sentence}": YouTube has potential? ${isYes}`);
    return isYes ?? true;

  } catch (error) {
    console.error("Error in evaluateYouTubePotential:", error);
    return true; // Fallback to searching YouTube
  }
}
