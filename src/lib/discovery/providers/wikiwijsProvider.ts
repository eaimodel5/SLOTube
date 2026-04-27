import { DiscoveryProvider, ProviderSearchInput, RawCandidate } from "./providerInterface";
import { webSearch } from "./webSearchHelper";

export const wikiwijsProvider: DiscoveryProvider = {
  sourceId: "wikiwijs",
  async search({ queries, maxResults }): Promise<RawCandidate[]> {
    const query = queries[0]?.text || "";
    if (!query) return [];
    return webSearch(query, "wikiwijs", "Wikiwijs", "wikiwijs.nl");
  }
};
