import { NormalizedSloGoal } from "../slo/sloTypes";
import { SCORING_CONFIG } from "./scoringConfig";
import { FALLBACK_THUMBNAIL } from "../media/thumbnailResolver";

export type MatchResult = {
  score: number;
  confidence: "low" | "medium" | "high";
  reason: string;
  evidence: string[];
  matchedFields: string[];
  penalties: string[];
};

function normalize(text?: string): string {
  if (!text) return "";
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter(t => t.length > 3);
}

function calculateTokenOverlap(source: string, target: string): number {
  const sourceTokens = new Set(tokenize(source));
  const targetTokens = new Set(tokenize(target));
  if (targetTokens.size === 0) return 0;
  
  let overlap = 0;
  targetTokens.forEach(t => {
    if (sourceTokens.has(t)) overlap++;
  });
  return overlap / targetTokens.size; // 0.0 to 1.0
}

function contains(source: string, target: string): boolean {
  if (!target || target.length < 4) return false;
  return normalize(source).includes(normalize(target));
}

export function matchVideoToGoal(video: any, goal: NormalizedSloGoal): MatchResult {
  let score = 0;
  const evidence: string[] = [];
  const matchedFields: string[] = [];
  const penalties: string[] = [];

  const videoTitle = video.title || "";
  const videoDesc = video.description || "";
  const videoFullText = `${videoTitle} ${videoDesc}`;

  // 1. Match with Sentence via Token Overlap
  const titleOverlap = calculateTokenOverlap(videoTitle, goal.sentence);
  const descOverlap = calculateTokenOverlap(videoDesc, goal.sentence);

  if (titleOverlap > 0.4) {
    score += SCORING_CONFIG.WEIGHTS.TITLE_SENTENCE * titleOverlap;
    matchedFields.push(`sentence (title ${Math.round(titleOverlap*100)}%)`);
    evidence.push(`Titel toont sterke overlap (${Math.round(titleOverlap*100)}%) met kerndoelzin`);
  } else if (descOverlap > 0.4) {
    score += SCORING_CONFIG.WEIGHTS.DESCRIPTION_SENTENCE * descOverlap;
    matchedFields.push(`sentence (desc ${Math.round(descOverlap*100)}%)`);
    evidence.push(`Beschrijving toont overlap (${Math.round(descOverlap*100)}%) met kerndoelzin`);
  }

  // 2. Match with Domain & Subject
  if (goal.domain && contains(videoFullText, goal.domain)) {
    score += SCORING_CONFIG.WEIGHTS.DOMAIN_MATCH;
    matchedFields.push("domain");
    evidence.push(`Match op domein: ${goal.domain}`);
  }
  if (goal.subject && contains(videoFullText, goal.subject)) {
    score += SCORING_CONFIG.WEIGHTS.SUBJECT_MATCH;
    matchedFields.push("subject");
  }

  // 3. Match with Elaborations & Illustrations
  const allContext = [...(goal.elaborations || []), ...(goal.baseUitwerkingen || []), ...(goal.hvwoUitwerkingen || [])];
  for (const item of allContext) {
    if (calculateTokenOverlap(videoFullText, item) > 0.6) {
      score += SCORING_CONFIG.WEIGHTS.ELABORATION_MATCH;
      matchedFields.push("elaboration");
      evidence.push(`Begrippen uit de SLO uitwerking gevonden`);
      break; 
    }
  }

  const allIllustrations = [...goal.examples, ...goal.baseIllustraties, ...goal.hvwoIllustraties];
  for (const item of allIllustrations) {
    if (calculateTokenOverlap(videoFullText, item) > 0.6) {
      score += SCORING_CONFIG.WEIGHTS.ILLUSTRATION_MATCH;
      matchedFields.push("illustration");
      evidence.push(`Begrippen uit het SLO voorbeeld gevonden`);
      break;
    }
  }

  // 4. Actor/Target Group
  if (goal.actor && contains(videoFullText, goal.actor)) {
    score += SCORING_CONFIG.WEIGHTS.ACTOR_MATCH;
    matchedFields.push("actor");
  }
  
  // Trusted Source Bonus
  const isTrusted = ["npo", "schooltv", "het-klokhuis", "wikiwijs", "openleermateriaal", "nl.wikipedia.org", "impuls-open-leermateriaal"].some(t => video.sourceId === t || video.sourceUrl?.includes(t));
  if (isTrusted || video.sourceId !== "youtube") {
    score += SCORING_CONFIG.WEIGHTS.TRUSTED_SOURCE_BONUS;
    evidence.push("Betrouwbare onderwijsbron bonus");
  }

  // 5. Penalties
  SCORING_CONFIG.NEGATIVE_TERMS.forEach(term => {
    if (contains(videoFullText, term)) {
      score += SCORING_CONFIG.PENALTIES.NON_EDUCATIONAL;
      penalties.push(`Negatieve term gevonden: ${term}`);
    }
  });

  if (!video.description || video.description.length < 20) {
    score += SCORING_CONFIG.PENALTIES.MISSING_DESCRIPTION;
    penalties.push("Korte of missende beschrijving");
  }
  
  if (!video.thumbnailUrl || video.thumbnailUrl === FALLBACK_THUMBNAIL || video.thumbnailStatus === "unreachable") {
    score += SCORING_CONFIG.PENALTIES.NO_THUMBNAIL;
    penalties.push("Geen geldige thumbnail beschikbaar");
  }

  // Final score normalization
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Confidence calculation
  let confidence: "low" | "medium" | "high" = "low";
  if (score > 70) confidence = "high";
  else if (score > 40) confidence = "medium";

  // Reason generation
  let reason = "Onvoldoende duidelijke match gevonden.";
  if (evidence.length > 0) {
    reason = evidence.join(". ");
  }

  return {
    score,
    confidence,
    reason,
    evidence,
    matchedFields,
    penalties
  };
}
