import { SearchProvider, SearchGatewayParams, SearchResultCandidate } from "../searchTypes";
import { canonicalizeUrl } from "../../media/urlUtils";

export const tavilyProvider: SearchProvider = {
  name: "tavily",
  async search(params: SearchGatewayParams): Promise<SearchResultCandidate[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      console.warn("TAVILY_API_KEY is not set. Cannot use tavilyProvider.");
      return [];
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: params.query,
          search_depth: "basic",
          include_domains: params.includeDomains,
          exclude_domains: params.excludeTerms,
          max_results: params.limit || 5
        })
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results: SearchResultCandidate[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          results.push({
            title: item.title,
            url: item.url,
            canonicalUrl: canonicalizeUrl(item.url),
            snippet: item.content,
            sourceId: "tavily_web",
            sourceName: new URL(item.url).hostname,
            providerTrace: "tavily"
          });
        }
      }

      return results;
    } catch (e) {
      console.error("Error in tavilyProvider search:", e);
      throw e;
    }
  }
};
