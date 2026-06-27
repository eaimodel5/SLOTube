import { SearchProvider, SearchGatewayParams, SearchResultCandidate } from "../searchTypes";
import { canonicalizeUrl } from "../../media/urlUtils";
import { GoogleGenAI } from "@google/genai";

export const googleGroundedProvider: SearchProvider = {
  name: "google",
  async search(params: SearchGatewayParams): Promise<SearchResultCandidate[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Cannot use googleGroundedProvider.");
      return [];
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build the prompt for Google Search Grounding
    let queryPrompt = `Zoek actuele webpagina's, artikelen en lesmateriaal voor de volgende zoekterm:\n\n"${params.query}"\n\n`;
    
    if (params.includeDomains && params.includeDomains.length > 0) {
      queryPrompt += `Focus het zoeken specifiek op deze domeinen: ${params.includeDomains.join(", ")}.\n`;
      queryPrompt += `Bijvoorbeeld door "site:domein.nl" in de zoekopdracht te gebruiken.\n`;
    }

    queryPrompt += `Geef een samenvatting van de beste bronnen en zorg dat elke genoemde bron een expliciete citation/link heeft.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: queryPrompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        return [];
      }

      const groundingMetadata = candidates[0].groundingMetadata;
      if (!groundingMetadata || !groundingMetadata.groundingChunks) {
        return [];
      }

      const results: SearchResultCandidate[] = [];
      const seenUrls = new Set<string>();

      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web && chunk.web.uri) {
          const url = chunk.web.uri;
          const title = chunk.web.title || "Gevonden bron via Google";
          const canonical = canonicalizeUrl(url);

          if (!seenUrls.has(canonical)) {
            seenUrls.add(canonical);
            results.push({
              title,
              url,
              canonicalUrl: canonical,
              snippet: title, // Grounding chunks don't always give a long snippet, we can enrich later
              sourceId: "google_grounding",
              sourceName: new URL(url).hostname,
              providerTrace: "google",
              citations: [] // Could be extracted if needed
            });
          }
        }
      }

      // If we need to slice it
      if (params.limit) {
        return results.slice(0, params.limit);
      }

      return results;
    } catch (e) {
      console.error("Error in googleGroundedProvider search:", e);
      throw e;
    }
  }
};
