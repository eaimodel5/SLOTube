export type VideoProvider = "youtube" | "web" | "rss" | "manual";

export interface VideoSource {
  id: string;
  name: string;
  provider: VideoProvider;
  enabled: boolean;
  priority: number;
  searchHints?: string[];
  url?: string;
  youtubeChannelId?: string;
  trusted?: boolean;
}

export const VIDEO_SOURCES: VideoSource[] = [
  {
    id: "youtube_general",
    name: "YouTube",
    provider: "youtube",
    enabled: true,
    priority: 50,
    trusted: false
  },
  {
    id: "schooltv",
    name: "Schooltv",
    provider: "web",
    enabled: true,
    priority: 90,
    searchHints: ["schooltv", "uitleg", "clip"],
    url: "https://schooltv.nl",
    trusted: true
  },
  {
    id: "het_klokhuis",
    name: "Het Klokhuis",
    provider: "web",
    enabled: true,
    priority: 85,
    searchHints: ["klokhuis", "uitleg"],
    url: "https://hetklokhuis.nl",
    trusted: true
  }
];
