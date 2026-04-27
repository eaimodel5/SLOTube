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
  
  aiAssessment?: any;
  goalSnapshot?: any;
}

export interface StoredVideo extends VideoCandidate {
  goalId: string;
  createdAt: any;
  updatedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectReason?: string;
  submittedBy?: string;
}
