export interface Goal {
  id: string;
  subject?: string;
  domain?: string;
  sentence?: string;
  description?: string;
  actor?: string;
  examples?: string[];
  elaborations?: string[];
}

export interface SloAlignment {
  goalId: string;
  score: number;
  confidence: "laag" | "midden" | "hoog";
  coveredElaborations: {
    text: string;
    evidence: string;
    confidence: number;
  }[];
  coveredIllustrations: {
    text: string;
    evidence: string;
    confidence: number;
  }[];
  missingParts: string[];
  doelgroepFit: "zwak" | "voldoende" | "sterk";
  reasonShort: string;
}

export interface VideoCandidate {
  id: string; // Internal stable ID
  videoId?: string; // Original provider ID (e.g. YouTube ID)
  title: string;
  description?: string;
  sourceUrl: string;
  canonicalUrl: string;
  thumbnailUrl: string;
  thumbnailStatus: string;
  channelTitle?: string;
  sourceId: string;
  sourceName: string;
  provider: "youtube" | "web" | "rss" | "manual";
  durationSeconds?: number;
  duration?: string;
  publishedAt?: string;
  
  status: "pending" | "approved" | "rejected";
  origin: "manual" | "youtube_search" | "web_search" | "discovery";
  
  matchScore: number;
  matchConfidence: "low" | "medium" | "high";
  matchReason: string;
  matchEvidence: string[];
  matchPenalties: string[];
  
  sloAlignment?: SloAlignment;
  aiAssessment?: any;
  goalSnapshot?: any;
}

export interface StoredVideo extends VideoCandidate {
  // `goalId` is kept for backwards compatibility during migration, but `video_goal_links` is the new truth
  goalId?: string;
  createdAt: any;
  updatedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectReason?: string;
  submittedBy?: string;
  assessedGoals?: any[]; // Keep for existing logic to not break fully
}

export interface VideoGoalLink {
  id: string; // videoId_goalId
  videoId: string;
  goalId: string;
  status: "pending" | "approved" | "rejected";
  matchScore: number;
  sloAlignment?: SloAlignment;
  aiFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: any;
  createdAt: any;
  updatedAt: any;
}
