import { DiscoveryProvider, ProviderSearchInput, RawCandidate } from "./providerInterface";
import { webSearch } from "./webSearchHelper";

export const schooltvProvider: DiscoveryProvider = {
  sourceId: "schooltv",
  async search({ queries, maxResults }): Promise<RawCandidate[]> {
    const activeQueries = queries.slice(0, 3);
    const results: RawCandidate[] = [];
    for (const q of activeQueries) {
      if (!q?.text) continue;
      const res = await webSearch(q.text, "schooltv", "Schooltv", "schooltv.nl");
      results.push(...res);
    }
    return results;
  }
};
