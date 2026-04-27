import { DiscoveryProvider, ProviderSearchInput, RawCandidate } from "./providerInterface";
import { webSearch } from "./webSearchHelper";

export const openLeermateriaalProvider: DiscoveryProvider = {
  sourceId: "openleermateriaal",
  async search({ queries, maxResults }): Promise<RawCandidate[]> {
    const query = queries[0]?.text || "";
    if (!query) return [];
    return webSearch(query, "openleermateriaal", "Openleermateriaal", "openleermateriaal.nl");
  }
};
