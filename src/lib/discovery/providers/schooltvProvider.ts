import { DiscoveryProvider, ProviderSearchInput, RawCandidate } from "./providerInterface";
import { webSearch } from "./webSearchHelper";

export const schooltvProvider: DiscoveryProvider = {
  sourceId: "schooltv",
  async search({ queries, maxResults }): Promise<RawCandidate[]> {
    const query = queries[0]?.text || "";
    if (!query) return [];
    return webSearch(query, "schooltv", "Schooltv", "schooltv.nl");
  }
};
