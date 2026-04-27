/**
 * Normalizes a URL by removing common tracking parameters and trailing slashes.
 */
export function canonicalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove UTM parameters
    const paramsToRemove = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "msclkid", "ref"
    ];
    
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
    
    // Normalize path (remove trailing slash)
    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    
    return `${urlObj.origin}${pathname}${urlObj.search}${urlObj.hash}`;
  } catch (e) {
    return url;
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generates a stable, Firestore-safe ID from a source and URL.
 */
export function generateStableId(sourceId: string, url: string): string {
  const canonical = canonicalizeUrl(url);
  const input = `${sourceId}:${canonical}`;
  // We combine multiple simple hashes with base64 encoding to give it a unique pseudo-random feel
  const h1 = simpleHash(input);
  const h2 = simpleHash(input.split("").reverse().join(""));
  return `${sourceId}-${h1}${h2}`.substring(0, 24).replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Extracts YouTube video ID from various URL formats.
 */
export function extractYoutubeId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}
