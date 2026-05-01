import { DiscoveryProvider, ProviderSearchInput, RawCandidate } from "./providerInterface";

export const youtubeProvider: DiscoveryProvider = {
  sourceId: "youtube",
  async search({ queries, maxResults }): Promise<RawCandidate[]> {
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUT_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
    if (!apiKey) return [];

    const results: RawCandidate[] = [];
    const seenIds = new Set<string>();

    // Use top 2-3 queries to stay within limits
    const topQueries = queries.slice(0, 3);

    for (const query of topQueries) {
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&safeSearch=moderate&maxResults=${maxResults}&q=${encodeURIComponent(query.text)}&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) continue;

        const data = await searchRes.json();
        if (!data.items) continue;

        for (const item of data.items) {
          const videoId = item.id.videoId;
          if (!videoId || seenIds.has(videoId)) continue;
          seenIds.add(videoId);

          results.push({
            title: item.snippet.title,
            description: item.snippet.description,
            sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
            canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.high?.url,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            sourceId: "youtube",
            sourceName: "YouTube",
            raw: item
          });
        }
      } catch (e) {
        console.error("YouTube provider error:", e);
      }
    }

    return results;
  }
};
