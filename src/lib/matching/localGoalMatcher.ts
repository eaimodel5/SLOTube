import { NormalizedSloGoal } from "../slo/sloTypes";
import { SCORING_CONFIG } from "./scoringConfig";

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
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function contains(source: string, target: string): boolean {
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

  // 1. Match with Sentence
  if (contains(videoTitle, goal.sentence)) {
    score += SCORING_CONFIG.WEIGHTS.TITLE_SENTENCE;
    matchedFields.push("sentence (title)");
    evidence.push("Titel matcht direct met kerndoelzin");
  } else if (contains(videoDesc, goal.sentence)) {
    score += SCORING_CONFIG.WEIGHTS.DESCRIPTION_SENTENCE;
    matchedFields.push("sentence (description)");
    evidence.push("Beschrijving matcht met kerndoelzin");
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
  const allContext = [...goal.elaborations, ...goal.baseUitwerkingen, ...goal.hvwoUitwerkingen];
  for (const item of allContext) {
    if (contains(videoFullText, item)) {
      score += SCORING_CONFIG.WEIGHTS.ELABORATION_MATCH;
      matchedFields.push("elaboration");
      evidence.push(`Gevonden uitwerking: ${item.slice(0, 30)}...`);
      break; 
    }
  }

  const allIllustrations = [...goal.examples, ...goal.baseIllustraties, ...goal.hvwoIllustraties];
  for (const item of allIllustrations) {
    if (contains(videoFullText, item)) {
      score += SCORING_CONFIG.WEIGHTS.ILLUSTRATION_MATCH;
      matchedFields.push("illustration");
      evidence.push(`Gevonden voorbeeld/illustratie: ${item.slice(0, 30)}...`);
      break;
    }
  }

  // 4. Actor/Target Group
  if (goal.actor && contains(videoFullText, goal.actor)) {
    score += SCORING_CONFIG.WEIGHTS.ACTOR_MATCH;
    matchedFields.push("actor");
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

  // Final score normalization
  score = Math.max(0, Math.min(100, score));

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
