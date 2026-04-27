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
  id?: string;
  videoId: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  channelTitle?: string;
  sourceId?: string;
  sourceName?: string;
  provider?: "youtube" | "web" | "rss" | "manual";
  durationSeconds?: number;
  publishedAt?: string;
  matchScore?: number;
  matchReason?: string;
  matchEvidence?: string[];
  assessedGoals?: string[];
  origin?: "manual" | "youtube_search" | "web_import" | "discovery";
  status?: "pending" | "approved" | "rejected";
  createdAt?: any;
  updatedAt?: any;
  duration?: string; // sometimes used in existing code
  sourceType?: string; // sometimes used
}

export interface StoredVideo extends VideoCandidate {
  id: string; // explicitly required when stored
  goalId: string;
  status: "pending" | "approved" | "rejected";
  origin: "manual" | "youtube_search" | "web_import" | "discovery";
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: any;
  rejectReason?: string;
}
