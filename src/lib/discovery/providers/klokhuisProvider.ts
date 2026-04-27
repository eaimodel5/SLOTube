import { DiscoveryProvider, ProviderSearchInput, RawCandidate } from "./providerInterface";
import { webSearch } from "./webSearchHelper";

export const klokhuisProvider: DiscoveryProvider = {
  sourceId: "het-klokhuis",
  async search({ queries, maxResults }): Promise<RawCandidate[]> {
    const activeQueries = queries.slice(0, 3);
    const results: RawCandidate[] = [];
    for (const q of activeQueries) {
      if (!q?.text) continue;
      const res = await webSearch(q.text, "het-klokhuis", "Het Klokhuis", "hetklokhuis.nl");
      results.push(...res);
    }
    return results;
  }
};
