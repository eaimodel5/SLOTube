import { extractYoutubeId } from "./urlUtils";

export type ThumbnailStatus = "real" | "opengraph" | "screenshot" | "source-logo" | "fallback";

export interface ThumbnailResolution {
  url: string;
  status: ThumbnailStatus;
}

export const FALLBACK_THUMBNAIL = "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop";

/**
 * Resolves the best possible thumbnail for a given result.
 */
export async function resolveThumbnail(
  sourceUrl: string,
  providedThumbnail?: string,
  sourceId?: string
): Promise<ThumbnailResolution> {
  // 1. YouTube ID check
  const ytId = extractYoutubeId(sourceUrl);
  if (ytId) {
    return {
      url: `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`,
      status: "real"
    };
  }

  // 2. Use provided thumbnail if available
  if (providedThumbnail && providedThumbnail.length > 5) {
    return {
      url: providedThumbnail,
      status: providedThumbnail.includes("og:") || providedThumbnail.includes("graph") ? "opengraph" : "real"
    };
  }

  // 3. Fallback to mshots screenshot service for web links
  try {
    const canonical = encodeURIComponent(sourceUrl);
    return {
      url: `https://s0.wordpress.com/mshots/v1/${canonical}?w=800`,
      status: "screenshot"
    };
  } catch (e) {
    return {
      url: FALLBACK_THUMBNAIL,
      status: "fallback"
    };
  }
}
