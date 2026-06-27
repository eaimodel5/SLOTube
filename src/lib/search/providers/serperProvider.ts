import { SearchProvider, SearchGatewayParams, SearchResultCandidate } from "../searchTypes";
import { canonicalizeUrl } from "../../media/urlUtils";

export const serperProvider: SearchProvider = {
  name: "serper",
  async search(params: SearchGatewayParams): Promise<SearchResultCandidate[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      console.warn("SERPER_API_KEY is not set. Cannot use serperProvider.");
      return [];
    }

    let query = params.query;
    if (params.includeDomains && params.includeDomains.length > 0) {
      const siteOp = params.includeDomains.map(d => `site:${d}`).join(" OR ");
      query = `(${siteOp}) ${query}`;
    }

    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: query,
          num: params.limit || 5,
          gl: "nl",
          hl: "nl"
        })
      });

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results: SearchResultCandidate[] = [];

      if (data.organic && Array.isArray(data.organic)) {
        for (const item of data.organic) {
          results.push({
            title: item.title,
            url: item.link,
            canonicalUrl: canonicalizeUrl(item.link),
            snippet: item.snippet,
            sourceId: "serper_web",
            sourceName: new URL(item.link).hostname,
            providerTrace: "serper"
          });
        }
      }

      return results;
    } catch (e) {
      console.error("Error in serperProvider search:", e);
      throw e;
    }
  }
};
