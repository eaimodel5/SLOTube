import type { Goal, VideoCandidate } from "../../types";
import { tokenize, normalizeText } from "../text/normalizeText";

const NEGATIVE_TERMS = ["trailer", "gameplay", "reaction", "muziek", "song", "lyrics"];

export interface MatchResult {
  score: number;
  reason: string;
  evidence: string[];
}

export function matchVideoToGoal(video: VideoCandidate, goal: Goal): MatchResult {
  const goalText = [
    goal.subject,
    goal.domain,
    goal.sentence,
    goal.description,
    ...(goal.examples || []),
    ...(goal.elaborations || [])
  ].join(" ");

  const videoText = [video.title, video.description, video.channelTitle, video.sourceName].join(" ");

  const goalTokens = new Set(tokenize(goalText));
  const videoTokens = new Set(tokenize(videoText));

  const overlap = [...goalTokens].filter((token) => videoTokens.has(token));
  const titleTokens = new Set(tokenize(video.title));
  const titleOverlap = [...goalTokens].filter((token) => titleTokens.has(token));

  let score = 0;
  score += Math.min(45, overlap.length * 5);
  score += Math.min(25, titleOverlap.length * 8);

  if (goal.domain && normalizeText(videoText).includes(normalizeText(goal.domain))) score += 10;
  if (goal.subject && normalizeText(videoText).includes(normalizeText(goal.subject))) score += 8;
  if (video.sourceName && ["schooltv", "het klokhuis"].includes(normalizeText(video.sourceName))) score += 7;

  const negativeHits = NEGATIVE_TERMS.filter((term) => normalizeText(videoText).includes(term));
  score -= negativeHits.length * 12;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const evidence = overlap.slice(0, 8);
  const reason = evidence.length > 0
    ? `Match op termen: ${evidence.join(", ")}.`
    : "Weinig duidelijke overlap met het kerndoel.";

  return { score, reason, evidence };
}
