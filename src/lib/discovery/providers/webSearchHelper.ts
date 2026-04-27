import { RawCandidate } from "./providerInterface";
import { canonicalizeUrl } from "../../media/urlUtils";

export async function webSearch(
  query: string, 
  sourceId: string, 
  sourceName: string, 
  siteOperator?: string
): Promise<RawCandidate[]> {
  const fullQuery = siteOperator ? `site:${siteOperator} ${query}` : query;
  
  try {
    const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(fullQuery)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });

    if (!ddgRes.ok) return [];

    const html = await ddgRes.text();
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);
    const results: RawCandidate[] = [];

    $('.result').slice(0, 5).each((i, el) => {
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      let url = $(el).find('.result__url').attr('href');

      if (title && url && !url.includes('duckduckgo.com/y.js')) {
        if (url.startsWith('//')) url = 'https:' + url;
        
        // Handle DuckDuckGo's internal redirection if present
        if (url.includes('uddg=')) {
          const match = url.match(/uddg=([^&]+)/);
          if (match) url = decodeURIComponent(match[1]);
        }

        results.push({
          title,
          description: snippet,
          sourceUrl: url,
          canonicalUrl: canonicalizeUrl(url),
          sourceId,
          sourceName,
          publishedAt: new Date().toISOString()
        });
      }
    });

    return results;
  } catch (e) {
    console.error(`Web search failed for ${sourceId}:`, e);
    return [];
  }
}
