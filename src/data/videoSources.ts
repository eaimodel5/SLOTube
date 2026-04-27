export interface VideoSource {
  id: string;
  name: string;
  type: "video" | "open-leermateriaal" | "achtergrond" | "artikel";
  provider: "youtube" | "web" | "rss" | "manual";
  enabled: boolean;
  reliabilityWeight: number;
}

export const VIDEO_SOURCES: VideoSource[] = [
  {
    id: "youtube",
    name: "YouTube",
    type: "video",
    provider: "youtube",
    enabled: true,
    reliabilityWeight: 0.7
  },
  {
    id: "schooltv",
    name: "Schooltv",
    type: "video",
    provider: "web",
    enabled: true,
    reliabilityWeight: 0.9
  },
  {
    id: "het-klokhuis",
    name: "Het Klokhuis",
    type: "video",
    provider: "web",
    enabled: true,
    reliabilityWeight: 0.85
  },
  {
    id: "wikiwijs",
    name: "Wikiwijs",
    type: "open-leermateriaal",
    provider: "web",
    enabled: true,
    reliabilityWeight: 0.8
  },
  {
    id: "openleermateriaal",
    name: "Openleermateriaal",
    type: "open-leermateriaal",
    provider: "web",
    enabled: true,
    reliabilityWeight: 0.8
  },
  {
    id: "impuls-open-leermateriaal",
    name: "Impuls Open Leermateriaal",
    type: "open-leermateriaal",
    provider: "web",
    enabled: true,
    reliabilityWeight: 0.8
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    type: "achtergrond",
    provider: "web",
    enabled: true,
    reliabilityWeight: 0.55
  },
  {
    id: "npo",
    name: "NPO",
    type: "video",
    provider: "web",
    enabled: true,
    reliabilityWeight: 0.75
  }
];

export function getSourceById(id: string) {
  return VIDEO_SOURCES.find(s => s.id === id);
}

export function getEnabledSources() {
  return VIDEO_SOURCES.filter(s => s.enabled);
}
