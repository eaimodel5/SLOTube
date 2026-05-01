import { GoogleGenAI } from "@google/genai";
import { evaluateYouTubePotential } from "./youtubePresearch";
import { NormalizedSloGoal } from "../slo/sloTypes";
import { generateQueriesForGoal } from "./queryGenerator";
import { youtubeProvider } from "./providers/youtubeProvider";
import { schooltvProvider } from "./providers/schooltvProvider";
import { klokhuisProvider } from "./providers/klokhuisProvider";
import { wikiwijsProvider } from "./providers/wikiwijsProvider";
import { openLeermateriaalProvider } from "./providers/openLeermateriaalProvider";
import { impulsProvider } from "./providers/impulsProvider";
import { npoProvider } from "./providers/npoProvider";
import { wikipediaProvider } from "./providers/wikipediaProvider";
import { DiscoveryProvider, RawCandidate } from "./providers/providerInterface";
import { matchVideoToGoal } from "../matching/localGoalMatcher";
import { runAiAssessment } from "../matching/optionalAiMatcher";
import { resolveThumbnail } from "../media/thumbnailResolver";
import { generateStableId, canonicalizeUrl } from "../media/urlUtils";
import { VideoCandidate } from "../../types";
import { getEnabledSources } from "../../data/videoSources";

const ALL_PROVIDERS: DiscoveryProvider[] = [
  youtubeProvider,
  schooltvProvider,
  klokhuisProvider,
  wikiwijsProvider,
  openLeermateriaalProvider,
  impulsProvider,
  npoProvider,
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
  
  // Use DB enabled sources if not provided
  const enabledIds = options.enabledSourceIds || getEnabledSources().map(s => s.id);
  const enabledProviders = ALL_PROVIDERS.filter(p => enabledIds.includes(p.sourceId));

  const rawCandidates: RawCandidate[] = [];
  const diagnostics = {
    queryCount: queries.length,
    sourcesUsed: enabledProviders.map(p => p.sourceId),
    rejectedCount: 0,
    duplicateCount: 0
  };

  // Validate YouTube potential if youtube is enabled
  let finalProviders = enabledProviders;
  if (finalProviders.some(p => p.sourceId === 'youtube')) {
    const hasYTPotential = await evaluateYouTubePotential(goal);
    if (!hasYTPotential) {
      finalProviders = finalProviders.filter(p => p.sourceId !== 'youtube');
      diagnostics.sourcesUsed = finalProviders.map(p => p.sourceId);
      console.log(`[Discovery] Skipped YouTube API for goal: ${goal.sentence}`);
    }
  }

  // Run all typical providers in parallel
  const results = await Promise.all(
    finalProviders.map(p => p.search({ goal, queries, maxResults }))
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
    if (matched.score < 5) { // Lower threshold for raw discovery so we actually get items back
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
    
    if (options.useAi) {
        const assessment = await runAiAssessment(candidate, goal);
        if (assessment) {
            candidate.aiAssessment = assessment;
        }
    }

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
