export interface SearchResultCandidate {
  title: string;
  url: string;
  canonicalUrl: string;
  snippet: string;
  sourceId: string;
  sourceName: string;
  thumbnailUrl?: string;
  contentPreview?: string;
  citations?: any[];
  providerTrace: string;
}

export interface SearchGatewayParams {
  query: string;
  includeDomains?: string[];
  excludeTerms?: string[];
  limit?: number;
}

export interface SearchProvider {
  name: string;
  search(params: SearchGatewayParams): Promise<SearchResultCandidate[]>;
}
