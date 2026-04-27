import { DiscoveryProvider, ProviderSearchInput, RawCandidate } from "./providerInterface";
import { webSearch } from "./webSearchHelper";

export const npoProvider: DiscoveryProvider = {
  sourceId: "npo",
  async search({ queries, maxResults }): Promise<RawCandidate[]> {
    const activeQueries = queries.slice(0, 3);
    const results: RawCandidate[] = [];
    for (const q of activeQueries) {
      if (!q?.text) continue;
      const res = await webSearch(q.text, "npo", "NPO", ""); // Without site restrict sometimes or with "npo.nl"
      results.push(...res);
    }
    return results;
  }
};
