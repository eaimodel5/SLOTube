import { NormalizedSloGoal } from "../../slo/sloTypes";
import { GeneratedQuery } from "../queryGenerator";

export type RawCandidate = {
  title: string;
  description?: string;
  sourceUrl: string;
  canonicalUrl?: string; // used for deduping
  thumbnailUrl?: string;
  duration?: string;
  channelTitle?: string;
  publishedAt?: string;
  sourceId: string;
  sourceName: string;
  raw?: any;
};

export interface ProviderSearchInput {
  goal: NormalizedSloGoal;
  queries: GeneratedQuery[];
  maxResults: number;
}

export interface DiscoveryProvider {
  sourceId: string;
  search: (input: ProviderSearchInput) => Promise<RawCandidate[]>;
}
