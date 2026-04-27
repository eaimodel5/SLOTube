import { DiscoveryProvider, ProviderSearchInput, RawCandidate } from "./providerInterface";
import { webSearch } from "./webSearchHelper";

export const wikipediaProvider: DiscoveryProvider = {
  sourceId: "wikipedia",
  async search({ queries, maxResults }): Promise<RawCandidate[]> {
    const query = queries[0]?.text || "";
    if (!query) return [];
    return webSearch(query, "wikipedia", "Wikipedia", "nl.wikipedia.org");
  }
};
