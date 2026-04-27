import { DiscoveryProvider, ProviderSearchInput, RawCandidate } from "./providerInterface";
import { webSearch } from "./webSearchHelper";

export const klokhuisProvider: DiscoveryProvider = {
  sourceId: "het-klokhuis",
  async search({ queries, maxResults }): Promise<RawCandidate[]> {
    const query = queries[0]?.text || "";
    if (!query) return [];
    return webSearch(query, "het-klokhuis", "Het Klokhuis", "hetklokhuis.nl");
  }
};
