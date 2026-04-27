import { NormalizedSloGoal } from "../slo/sloTypes";
import { generateQueriesForGoal } from "./queryGenerator";
import { youtubeProvider } from "./providers/youtubeProvider";
import { schooltvProvider } from "./providers/schooltvProvider";
import { klokhuisProvider } from "./providers/klokhuisProvider";
import { wikiwijsProvider } from "./providers/wikiwijsProvider";
import { openLeermateriaalProvider } from "./providers/openLeermateriaalProvider";
import { wikipediaProvider } from "./providers/wikipediaProvider";
import { DiscoveryProvider, RawCandidate } from "./providers/providerInterface";
import { matchVideoToGoal } from "../matching/localGoalMatcher";
import { resolveThumbnail } from "../media/thumbnailResolver";
import { generateStableId, canonicalizeUrl } from "../media/urlUtils";
import { VideoCandidate } from "../../types";

const PROVIDERS: DiscoveryProvider[] = [
  youtubeProvider,
  schooltvProvider,
  klokhuisProvider,
  wikiwijsProvider,
  openLeermateriaalProvider,
  wikipediaProvider
];

export interface DiscoveryOptions {
  useAi?: boolean;
  maxResults?: number;
  enabledSourceIds?: string[];
}

export async function runDiscoveryForGoal(
  goal: NormalizedSloGoal,
  options: DiscoveryOptions = {}
): Promise<{ goalId: string; results: VideoCandidate[]; diagnostics: any }> {
  const maxResults = options.maxResults || 12;
  const queries = generateQueriesForGoal(goal);
  const enabledProviders = PROVIDERS.filter(p => 
    !options.enabledSourceIds || options.enabledSourceIds.includes(p.sourceId)
  );

  const rawCandidates: RawCandidate[] = [];
  const diagnostics = {
    queryCount: queries.length,
    sourcesUsed: enabledProviders.map(p => p.sourceId),
    rejectedCount: 0,
    duplicateCount: 0
  };

  // Run all providers in parallel
  const results = await Promise.all(
    enabledProviders.map(p => p.search({ goal, queries, maxResults }))
  );

  results.forEach(res => rawCandidates.push(...res));

  // Deduplicate and Normalize
  const uniqueCandidates = new Map<string, VideoCandidate>();
  
  for (const raw of rawCandidates) {
    const canonical = canonicalizeUrl(raw.sourceUrl);
    const id = generateStableId(raw.sourceId, canonical);

    if (uniqueCandidates.has(id)) {
      diagnostics.duplicateCount++;
      continue;
    }

    const matched = matchVideoToGoal(raw, goal);
    
    // Filter by threshold
    if (matched.score < 30) { // Slightly lower threshold for raw discovery before manual review
      diagnostics.rejectedCount++;
      continue;
    }

    const thumb = await resolveThumbnail(raw.sourceUrl, raw.thumbnailUrl, raw.sourceId);

    const candidate: VideoCandidate = {
      id,
      title: raw.title,
      description: raw.description,
      sourceUrl: raw.sourceUrl,
      canonicalUrl: canonical,
      thumbnailUrl: thumb.url,
      thumbnailStatus: thumb.status,
      channelTitle: raw.channelTitle,
      sourceId: raw.sourceId,
      sourceName: raw.sourceName,
      provider: raw.sourceId === "youtube" ? "youtube" : "web",
      duration: raw.duration,
      publishedAt: raw.publishedAt,
      
      status: "pending",
      origin: "discovery",
      
      matchScore: matched.score,
      matchConfidence: matched.confidence,
      matchReason: matched.reason,
      matchEvidence: matched.evidence,
      matchPenalties: matched.penalties,
      
      goalSnapshot: goal // Plan says to store snapshot
    };

    uniqueCandidates.set(id, candidate);
  }

  const sortedResults = Array.from(uniqueCandidates.values())
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxResults);

  return {
    goalId: goal.id,
    results: sortedResults,
    diagnostics
  };
}
