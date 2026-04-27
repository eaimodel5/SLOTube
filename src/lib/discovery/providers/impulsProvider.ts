import { DiscoveryProvider, ProviderSearchInput, RawCandidate } from "./providerInterface";
import { webSearch } from "./webSearchHelper";

export const impulsProvider: DiscoveryProvider = {
  sourceId: "impuls-open-leermateriaal",
  async search({ queries, maxResults }): Promise<RawCandidate[]> {
    const activeQueries = queries.slice(0, 3);
    const results: RawCandidate[] = [];
    for (const q of activeQueries) {
      if (!q?.text) continue;
      const res = await webSearch(
        `${q.text} "impuls open leermateriaal"`,
        "impuls-open-leermateriaal",
        "Impuls Open Leermateriaal",
        "openleermateriaal.nl"
      );
      results.push(...res);
    }
    return results;
  }
};
